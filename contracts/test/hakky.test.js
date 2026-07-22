const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_BTC = 100_000_000n; // 1 BTC in satoshis / cBTC base units

async function deployFixture() {
  const [admin, alice, bob, mallory] = await ethers.getSigners();

  const Registry = await ethers.getContractFactory("AttestationRegistry");
  const registry = await Registry.deploy(admin.address);

  const Oracle = await ethers.getContractFactory("ReserveOracle");
  const oracle = await Oracle.deploy(admin.address);

  const Policy = await ethers.getContractFactory("CompliancePolicy");
  const policy = await Policy.deploy(admin.address, await registry.getAddress());

  const CleanBTC = await ethers.getContractFactory("CleanBTC");
  const cbtc = await CleanBTC.deploy(
    admin.address,
    await oracle.getAddress(),
    await policy.getAddress()
  );

  const Vault = await ethers.getContractFactory("ReserveVault");
  const vault = await Vault.deploy(
    admin.address,
    await cbtc.getAddress(),
    await registry.getAddress()
  );

  // Wire roles.
  await cbtc.grantRole(await cbtc.MINTER_ROLE(), await vault.getAddress());
  await cbtc.grantRole(await cbtc.BURNER_ROLE(), await vault.getAddress());
  await registry.grantRole(await registry.ATTESTOR_ROLE(), admin.address);
  await oracle.grantRole(await oracle.RESERVE_UPDATER_ROLE(), admin.address);
  await vault.grantRole(await vault.VERIFIER_ROLE(), admin.address);
  await vault.grantRole(await vault.SETTLER_ROLE(), admin.address);

  return { admin, alice, bob, mallory, registry, oracle, policy, cbtc, vault };
}

describe("CleanBTC (cBTC)", () => {
  it("uses 8 decimals to mirror BTC", async () => {
    const { cbtc } = await deployFixture();
    expect(await cbtc.decimals()).to.equal(8);
    expect(await cbtc.symbol()).to.equal("cBTC");
    expect(await cbtc.name()).to.equal("Clean BTC");
  });

  it("enforces the proof-of-reserves solvency invariant on mint", async () => {
    const { cbtc, oracle, vault, admin, alice } = await deployFixture();

    // No reserves yet -> mint must revert.
    await expect(
      vault.processDeposit(alice.address, ONE_BTC, ethers.id("btc-tx-1"), "ipfs://ev1")
    ).to.be.revertedWithCustomError(cbtc, "ExceedsReserves");

    // Attest 1 BTC of reserves, then mint exactly 1 cBTC.
    await oracle.connect(admin).updateReserves(ONE_BTC, "ipfs://reserves-1");
    await vault.processDeposit(alice.address, ONE_BTC, ethers.id("btc-tx-1"), "ipfs://ev1");
    expect(await cbtc.balanceOf(alice.address)).to.equal(ONE_BTC);
    expect(await cbtc.totalSupply()).to.equal(ONE_BTC);

    // Minting one more sat would exceed reserves.
    await expect(
      vault.processDeposit(alice.address, 1n, ethers.id("btc-tx-2"), "ipfs://ev2")
    ).to.be.revertedWithCustomError(cbtc, "ExceedsReserves");
  });

  it("only allows MINTER_ROLE to mint and BURNER_ROLE to burn", async () => {
    const { cbtc, alice } = await deployFixture();
    await expect(cbtc.connect(alice).mint(alice.address, ONE_BTC)).to.be.reverted;
    await expect(cbtc.connect(alice).burn(alice.address, ONE_BTC)).to.be.reverted;
  });
});

describe("AttestationRegistry", () => {
  it("issues, reads, expires, and revokes attestations", async () => {
    const { registry, admin, alice } = await deployFixture();

    // Clean attestation, score 90, 90-day TTL.
    await registry.connect(admin).attest(alice.address, 90, false, 0, "ipfs://report");
    expect(await registry.isClean(alice.address, 50)).to.equal(true);
    expect(await registry.isClean(alice.address, 95)).to.equal(false); // below required score
    expect(await registry.isSanctioned(alice.address)).to.equal(false);

    const att = await registry.getAttestation(alice.address);
    expect(att.score).to.equal(90);
    expect(att.provider).to.equal(admin.address);

    // Fast-forward past expiry -> no longer clean.
    await time.increase(91 * 24 * 60 * 60);
    expect(await registry.isClean(alice.address, 50)).to.equal(false);
    expect(await registry.hasLiveAttestation(alice.address)).to.equal(false);

    // Re-attest then revoke.
    await registry.connect(admin).attest(alice.address, 90, false, 0, "ipfs://report2");
    expect(await registry.isClean(alice.address, 50)).to.equal(true);
    await registry.connect(admin).revoke(alice.address);
    expect(await registry.isClean(alice.address, 50)).to.equal(false);
  });

  it("flags sanctioned addresses and rejects out-of-range scores", async () => {
    const { registry, admin, mallory } = await deployFixture();
    await registry.connect(admin).attest(mallory.address, 0, true, 0, "ipfs://ofac");
    expect(await registry.isSanctioned(mallory.address)).to.equal(true);
    expect(await registry.isClean(mallory.address, 0)).to.equal(false); // sanctioned never clean

    await expect(
      registry.connect(admin).attest(mallory.address, 101, false, 0, "ipfs://x")
    ).to.be.revertedWithCustomError(registry, "ScoreOutOfRange");
  });

  it("restricts attesting to ATTESTOR_ROLE", async () => {
    const { registry, alice } = await deployFixture();
    await expect(
      registry.connect(alice).attest(alice.address, 100, false, 0, "ipfs://self")
    ).to.be.reverted;
  });
});

describe("CompliancePolicy", () => {
  async function fundedFixture() {
    const f = await deployFixture();
    await f.oracle.updateReserves(10n * ONE_BTC, "ipfs://reserves");
    await f.vault.processDeposit(f.alice.address, 2n * ONE_BTC, ethers.id("d-alice"), "ipfs://e");
    return f;
  }

  it("MONITOR mode (default) never blocks transfers", async () => {
    const { cbtc, alice, bob } = await fundedFixture();
    await expect(cbtc.connect(alice).transfer(bob.address, ONE_BTC)).to.not.be.reverted;
    expect(await cbtc.balanceOf(bob.address)).to.equal(ONE_BTC);
  });

  it("GATED mode blocks transfers unless both parties are attested-clean", async () => {
    const { cbtc, policy, registry, admin, alice, bob } = await fundedFixture();
    await policy.connect(admin).setMode(1); // GATED
    await policy.connect(admin).setMinScore(50);

    // Neither attested -> blocked.
    await expect(
      cbtc.connect(alice).transfer(bob.address, ONE_BTC)
    ).to.be.revertedWithCustomError(cbtc, "TransferNotAllowed");

    // Attest both -> allowed.
    await registry.connect(admin).attest(alice.address, 80, false, 0, "ipfs://a");
    await registry.connect(admin).attest(bob.address, 80, false, 0, "ipfs://b");
    await expect(cbtc.connect(alice).transfer(bob.address, ONE_BTC)).to.not.be.reverted;
  });

  it("ALLOWLIST mode only permits explicitly allowlisted parties", async () => {
    const { cbtc, policy, admin, alice, bob } = await fundedFixture();
    await policy.connect(admin).setMode(2); // ALLOWLIST

    await expect(
      cbtc.connect(alice).transfer(bob.address, ONE_BTC)
    ).to.be.revertedWithCustomError(cbtc, "TransferNotAllowed");

    await policy.connect(admin).setAllowlisted(alice.address, true);
    await policy.connect(admin).setAllowlisted(bob.address, true);
    await expect(cbtc.connect(alice).transfer(bob.address, ONE_BTC)).to.not.be.reverted;
  });
});

describe("ReserveVault", () => {
  it("mints against verified deposits and guards against replay", async () => {
    const { vault, cbtc, oracle, admin, alice } = await deployFixture();
    await oracle.updateReserves(5n * ONE_BTC, "ipfs://r");

    const txid = ethers.id("btc-deposit-A");
    await vault.processDeposit(alice.address, ONE_BTC, txid, "ipfs://prov");
    expect(await cbtc.balanceOf(alice.address)).to.equal(ONE_BTC);

    // Same txid can't be processed twice.
    await expect(
      vault.processDeposit(alice.address, ONE_BTC, txid, "ipfs://prov")
    ).to.be.revertedWithCustomError(vault, "DepositAlreadyProcessed");
  });

  it("blocks minting to sanctioned recipients", async () => {
    const { vault, oracle, registry, admin, mallory } = await deployFixture();
    await oracle.updateReserves(5n * ONE_BTC, "ipfs://r");
    await registry.connect(admin).attest(mallory.address, 0, true, 0, "ipfs://ofac");

    await expect(
      vault.processDeposit(mallory.address, ONE_BTC, ethers.id("d"), "ipfs://p")
    ).to.be.revertedWithCustomError(vault, "RecipientSanctioned");
  });

  it("redeems by burning cBTC and records a pending payout", async () => {
    const { vault, cbtc, oracle, alice } = await deployFixture();
    await oracle.updateReserves(5n * ONE_BTC, "ipfs://r");
    await vault.processDeposit(alice.address, 2n * ONE_BTC, ethers.id("d"), "ipfs://p");

    await expect(vault.connect(alice).requestRedeem(ONE_BTC, "bc1qexamplepayout"))
      .to.emit(vault, "RedeemRequested")
      .withArgs(1n, alice.address, ONE_BTC, "bc1qexamplepayout");

    expect(await cbtc.balanceOf(alice.address)).to.equal(ONE_BTC); // 2 - 1 burned
    const r = await vault.redemptions(1n);
    expect(r.status).to.equal(1); // Pending
    expect(r.amountSats).to.equal(ONE_BTC);
  });

  it("settles and cancels redemptions correctly", async () => {
    const { vault, cbtc, oracle, admin, alice } = await deployFixture();
    await oracle.updateReserves(5n * ONE_BTC, "ipfs://r");
    await vault.processDeposit(alice.address, 2n * ONE_BTC, ethers.id("d"), "ipfs://p");

    // Settle path.
    await vault.connect(alice).requestRedeem(ONE_BTC, "bc1qpay1");
    await expect(vault.connect(admin).settleRedeem(1n, ethers.id("btc-settle")))
      .to.emit(vault, "RedeemSettled");
    expect((await vault.redemptions(1n)).status).to.equal(2); // Settled

    // Cancel path re-mints the burned cBTC back to the requester.
    await vault.connect(alice).requestRedeem(ONE_BTC, "bc1qpay2");
    expect(await cbtc.balanceOf(alice.address)).to.equal(0n);
    await vault.connect(admin).cancelRedeem(2n);
    expect(await cbtc.balanceOf(alice.address)).to.equal(ONE_BTC);
    expect((await vault.redemptions(2n)).status).to.equal(3); // Cancelled
  });

  it("restricts verifier and settler actions by role", async () => {
    const { vault, oracle, alice } = await deployFixture();
    await oracle.updateReserves(5n * ONE_BTC, "ipfs://r");
    await expect(
      vault.connect(alice).processDeposit(alice.address, ONE_BTC, ethers.id("x"), "ipfs://p")
    ).to.be.reverted;
    await expect(vault.connect(alice).settleRedeem(1n, ethers.id("y"))).to.be.reverted;
  });
});

describe("End-to-end: clean mint -> transfer -> redeem", () => {
  it("runs the full lifecycle with reserves fully backing supply", async () => {
    const { vault, cbtc, oracle, registry, admin, alice, bob } = await deployFixture();

    // Custodian attests 3 BTC of reserves.
    await oracle.updateReserves(3n * ONE_BTC, "ipfs://reserves-latest");

    // Screened deposit -> mint 3 cBTC to Alice.
    await registry.connect(admin).attest(alice.address, 95, false, 0, "ipfs://clean-alice");
    await vault.processDeposit(alice.address, 3n * ONE_BTC, ethers.id("btc-in"), "ipfs://prov");

    // Solvency holds: supply <= reserves.
    expect(await cbtc.totalSupply()).to.equal(3n * ONE_BTC);
    expect(await cbtc.totalSupply()).to.be.lte(await oracle.reserveSats());

    // Alice sends 1 cBTC to Bob (MONITOR mode: open transfer).
    await cbtc.connect(alice).transfer(bob.address, ONE_BTC);

    // Alice redeems her remaining 2 cBTC for BTC.
    await vault.connect(alice).requestRedeem(2n * ONE_BTC, "bc1qalice");
    await vault.connect(admin).settleRedeem(1n, ethers.id("btc-out"));

    expect(await cbtc.balanceOf(alice.address)).to.equal(0n);
    expect(await cbtc.balanceOf(bob.address)).to.equal(ONE_BTC);
    expect(await cbtc.totalSupply()).to.equal(ONE_BTC);
  });
});
