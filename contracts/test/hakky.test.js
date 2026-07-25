const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_BTC = 100_000_000n; // 1 BTC in satoshis / cBTC base units
const HALF_BTC = ONE_BTC / 2n;
const QUARTER_BTC = ONE_BTC / 4n;
const BTC_ADDRESS_A = `bc1q${"a".repeat(38)}`;
const BTC_ADDRESS_B = `bc1q${"b".repeat(38)}`;

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
  await vault.grantRole(await vault.PAUSER_ROLE(), admin.address);

  return { admin, alice, bob, mallory, registry, oracle, policy, cbtc, vault };
}

describe("Deployment safety", () => {
  it("rejects zero-address administrators and dependencies", async () => {
    const [admin] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("AttestationRegistry");
    const Oracle = await ethers.getContractFactory("ReserveOracle");
    const Policy = await ethers.getContractFactory("CompliancePolicy");
    const CleanBTC = await ethers.getContractFactory("CleanBTC");

    await expect(Registry.deploy(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(Registry, "ZeroAddress");
    await expect(Oracle.deploy(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(Oracle, "ZeroAddress");

    const registry = await Registry.deploy(admin.address);
    const oracle = await Oracle.deploy(admin.address);
    await expect(Policy.deploy(admin.address, ethers.ZeroAddress))
      .to.be.revertedWithCustomError(Policy, "ZeroAddress");
    await expect(CleanBTC.deploy(admin.address, ethers.ZeroAddress, ethers.ZeroAddress))
      .to.be.revertedWithCustomError(CleanBTC, "ZeroAddress");

    // Keep successful dependencies referenced so this test also proves normal deployment.
    expect(await registry.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await oracle.getAddress()).to.not.equal(ethers.ZeroAddress);
  });
});

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
      vault.processDeposit(alice.address, HALF_BTC, ethers.id("btc-tx-1"), 0, "ipfs://ev1")
    ).to.be.revertedWithCustomError(vault, "ExceedsAvailableBacking");

    // Attest 0.5 BTC of reserves, then mint exactly 0.5 cBTC.
    await oracle.connect(admin).updateReserves(HALF_BTC, "ipfs://reserves-1");
    await vault.processDeposit(alice.address, HALF_BTC, ethers.id("btc-tx-1"), 0, "ipfs://ev1");
    expect(await cbtc.balanceOf(alice.address)).to.equal(HALF_BTC);
    expect(await cbtc.totalSupply()).to.equal(HALF_BTC);

    // Minting one more sat would exceed reserves.
    await expect(
      vault.processDeposit(alice.address, 1n, ethers.id("btc-tx-2"), 0, "ipfs://ev2")
    ).to.be.revertedWithCustomError(vault, "ExceedsAvailableBacking");
  });

  it("enforces an immutable one-BTC pilot supply ceiling", async () => {
    const { cbtc, oracle, vault, alice } = await deployFixture();
    await oracle.updateReserves(2n * ONE_BTC, "ipfs://reserves");

    expect(await cbtc.PILOT_SUPPLY_CAP_SATS()).to.equal(ONE_BTC);
    await vault.processDeposit(alice.address, ONE_BTC, ethers.id("btc-tx-1"), 0, "ipfs://ev1");

    await expect(
      vault.processDeposit(alice.address, 1n, ethers.id("btc-tx-2"), 0, "ipfs://ev2")
    )
      .to.be.revertedWithCustomError(vault, "ExceedsPilotLiabilityCap")
      .withArgs(ONE_BTC + 1n, ONE_BTC);
  });

  it("fails closed when the reserve publication is stale or unavailable", async () => {
    const { cbtc, oracle, vault, admin, alice } = await deployFixture();

    await expect(cbtc.connect(admin).setReserveOracle(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(cbtc, "ZeroAddress");

    await oracle.updateReserves(ONE_BTC, "ipfs://reserves");
    await time.increase(12 * 60 * 60 + 1);
    await expect(
      vault.processDeposit(alice.address, ONE_BTC, ethers.id("stale-deposit"), 0, "ipfs://ev")
    ).to.be.revertedWithCustomError(cbtc, "ReserveAttestationStale");
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

  it("keeps sanctions sticky (fail-closed) after expiry, and clears them only on revoke", async () => {
    const { registry, admin, mallory } = await deployFixture();

    // Sanction with the default 90-day TTL.
    await registry.connect(admin).attest(mallory.address, 0, true, 0, "ipfs://ofac");
    expect(await registry.isSanctioned(mallory.address)).to.equal(true);

    // Past the cleanliness expiry window, the address is no longer "clean"/"live"...
    await time.increase(120 * 24 * 60 * 60);
    expect(await registry.hasLiveAttestation(mallory.address)).to.equal(false);
    // ...but the sanctions flag must NOT lapse just because time passed (fail closed).
    expect(await registry.isSanctioned(mallory.address)).to.equal(true);

    // Only an explicit revoke (or a newer clean attestation) clears it.
    await registry.connect(admin).revoke(mallory.address);
    expect(await registry.isSanctioned(mallory.address)).to.equal(false);
  });

  it("supports non-expiring attestations via the type(uint64).max sentinel", async () => {
    const { registry, admin, alice } = await deployFixture();
    const MAX_U64 = 2n ** 64n - 1n;

    await registry.connect(admin).attest(alice.address, 95, false, MAX_U64, "ipfs://permanent");
    const att = await registry.getAttestation(alice.address);
    expect(att.expiresAt).to.equal(0n); // stored 0 == never expires

    // Still live and clean far in the future.
    await time.increase(3650 * 24 * 60 * 60); // ~10 years
    expect(await registry.hasLiveAttestation(alice.address)).to.equal(true);
    expect(await registry.isClean(alice.address, 50)).to.equal(true);
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
    await f.oracle.updateReserves(ONE_BTC, "ipfs://reserves");
    await f.vault.processDeposit(f.alice.address, ONE_BTC, ethers.id("d-alice"), 0, "ipfs://e");
    return f;
  }

  it("MONITOR mode (default) never blocks transfers", async () => {
    const { cbtc, alice, bob } = await fundedFixture();
    await expect(cbtc.connect(alice).transfer(bob.address, HALF_BTC)).to.not.be.reverted;
    expect(await cbtc.balanceOf(bob.address)).to.equal(HALF_BTC);
  });

  it("GATED mode blocks transfers unless both parties are attested-clean", async () => {
    const { cbtc, policy, registry, admin, alice, bob } = await fundedFixture();
    await policy.connect(admin).setMode(1); // GATED
    await policy.connect(admin).setMinScore(50);

    // Neither attested -> blocked.
    await expect(
      cbtc.connect(alice).transfer(bob.address, HALF_BTC)
    ).to.be.revertedWithCustomError(cbtc, "TransferNotAllowed");

    // Attest both -> allowed.
    await registry.connect(admin).attest(alice.address, 80, false, 0, "ipfs://a");
    await registry.connect(admin).attest(bob.address, 80, false, 0, "ipfs://b");
    await expect(cbtc.connect(alice).transfer(bob.address, HALF_BTC)).to.not.be.reverted;
  });

  it("GATED mode fails closed when the attestation registry is unavailable", async () => {
    const { cbtc, policy, admin, alice, bob } = await fundedFixture();
    await policy.connect(admin).setRegistry(ethers.ZeroAddress);
    await policy.connect(admin).setMode(1); // GATED

    await expect(
      cbtc.connect(alice).transfer(bob.address, HALF_BTC)
    ).to.be.revertedWithCustomError(cbtc, "TransferNotAllowed");
  });

  it("GATED mode never lets an allowlist override bypass sanctions", async () => {
    const { cbtc, policy, registry, admin, alice, bob } = await fundedFixture();
    await policy.connect(admin).setMode(1); // GATED
    await policy.connect(admin).setAllowlisted(alice.address, true);
    await policy.connect(admin).setAllowlisted(bob.address, true);

    // Allowlisting bypasses the cleanliness-score requirement.
    await expect(cbtc.connect(alice).transfer(bob.address, 1n)).to.not.be.reverted;

    // It must not bypass an explicit sanctions flag.
    await registry.connect(admin).attest(bob.address, 0, true, 0, "ipfs://ofac");
    await expect(
      cbtc.connect(alice).transfer(bob.address, HALF_BTC)
    ).to.be.revertedWithCustomError(cbtc, "TransferNotAllowed");
  });

  it("ALLOWLIST mode only permits explicitly allowlisted parties", async () => {
    const { cbtc, policy, admin, alice, bob } = await fundedFixture();
    await policy.connect(admin).setMode(2); // ALLOWLIST

    await expect(
      cbtc.connect(alice).transfer(bob.address, HALF_BTC)
    ).to.be.revertedWithCustomError(cbtc, "TransferNotAllowed");

    await policy.connect(admin).setAllowlisted(alice.address, true);
    await policy.connect(admin).setAllowlisted(bob.address, true);
    await expect(cbtc.connect(alice).transfer(bob.address, HALF_BTC)).to.not.be.reverted;
  });
});

describe("ReserveVault", () => {
  it("mints against verified deposits and guards against replay", async () => {
    const { vault, cbtc, oracle, admin, alice } = await deployFixture();
    await oracle.updateReserves(ONE_BTC, "ipfs://r");

    const txid = ethers.id("btc-deposit-A");
    await vault.processDeposit(alice.address, HALF_BTC, txid, 0, "ipfs://prov");
    expect(await cbtc.balanceOf(alice.address)).to.equal(HALF_BTC);

    // The same outpoint cannot be processed twice.
    await expect(
      vault.processDeposit(alice.address, HALF_BTC, txid, 0, "ipfs://prov")
    ).to.be.revertedWithCustomError(vault, "DepositAlreadyProcessed");

    // A distinct output from the same transaction is a distinct deposit.
    await vault.processDeposit(alice.address, HALF_BTC, txid, 1, "ipfs://prov-2");
    expect(await cbtc.balanceOf(alice.address)).to.equal(ONE_BTC);
  });

  it("blocks minting to sanctioned recipients", async () => {
    const { vault, oracle, registry, admin, mallory } = await deployFixture();
    await oracle.updateReserves(ONE_BTC, "ipfs://r");
    await registry.connect(admin).attest(mallory.address, 0, true, 0, "ipfs://ofac");

    await expect(
      vault.processDeposit(mallory.address, ONE_BTC, ethers.id("d"), 0, "ipfs://p")
    ).to.be.revertedWithCustomError(vault, "RecipientSanctioned");
  });

  it("redeems by burning cBTC and records a pending payout", async () => {
    const { vault, cbtc, oracle, alice } = await deployFixture();
    await oracle.updateReserves(ONE_BTC, "ipfs://r");
    await vault.processDeposit(alice.address, ONE_BTC, ethers.id("d"), 0, "ipfs://p");

    await expect(vault.connect(alice).requestRedeem(HALF_BTC, BTC_ADDRESS_A))
      .to.emit(vault, "RedeemRequested")
      .withArgs(1n, alice.address, HALF_BTC, BTC_ADDRESS_A);

    expect(await cbtc.balanceOf(alice.address)).to.equal(HALF_BTC);
    const r = await vault.redemptions(1n);
    expect(r.status).to.equal(1); // Pending
    expect(r.amountSats).to.equal(HALF_BTC);
  });

  it("settles and cancels redemptions correctly", async () => {
    const { vault, cbtc, oracle, admin, alice } = await deployFixture();
    await oracle.updateReserves(ONE_BTC, "ipfs://r");
    await vault.processDeposit(alice.address, ONE_BTC, ethers.id("d"), 0, "ipfs://p");

    // Settle path.
    await vault.connect(alice).requestRedeem(HALF_BTC, BTC_ADDRESS_A);
    await expect(vault.connect(admin).settleRedeem(1n, ethers.id("btc-settle")))
      .to.emit(vault, "RedeemSettled");
    expect((await vault.redemptions(1n)).status).to.equal(2); // Settled

    // Cancel path re-mints the burned cBTC back to the requester.
    await vault.connect(alice).requestRedeem(HALF_BTC, BTC_ADDRESS_B);
    expect(await cbtc.balanceOf(alice.address)).to.equal(0n);
    await vault.connect(admin).cancelRedeem(2n);
    expect(await cbtc.balanceOf(alice.address)).to.equal(HALF_BTC);
    expect((await vault.redemptions(2n)).status).to.equal(3); // Cancelled
  });

  it("restricts verifier and settler actions by role", async () => {
    const { vault, oracle, alice } = await deployFixture();
    await oracle.updateReserves(ONE_BTC, "ipfs://r");
    await expect(
      vault.connect(alice).processDeposit(alice.address, ONE_BTC, ethers.id("x"), 0, "ipfs://p")
    ).to.be.reverted;
    await expect(vault.connect(alice).settleRedeem(1n, ethers.id("y"))).to.be.reverted;
  });

  it("reserves liability capacity until a pending redemption settles or cancels", async () => {
    const { vault, cbtc, oracle, admin, alice } = await deployFixture();
    await oracle.updateReserves(2n * ONE_BTC, "ipfs://r");
    await vault.processDeposit(alice.address, ONE_BTC, ethers.id("deposit-a"), 0, "ipfs://p");
    await vault.connect(alice).requestRedeem(HALF_BTC, BTC_ADDRESS_A);

    expect(await cbtc.totalSupply()).to.equal(HALF_BTC);
    expect(await vault.pendingRedemptionSats()).to.equal(HALF_BTC);
    await expect(
      vault.processDeposit(alice.address, 1n, ethers.id("deposit-b"), 0, "ipfs://p")
    ).to.be.revertedWithCustomError(vault, "ExceedsPilotLiabilityCap");

    await vault.connect(admin).cancelRedeem(1n);
    expect(await cbtc.totalSupply()).to.equal(ONE_BTC);
    expect(await vault.pendingRedemptionSats()).to.equal(0n);
  });

  it("cancels a pending redemption even when the reserve attestation is stale", async () => {
    const { vault, cbtc, oracle, admin, alice } = await deployFixture();
    await oracle.updateReserves(ONE_BTC, "ipfs://r");
    await vault.processDeposit(alice.address, ONE_BTC, ethers.id("deposit-a"), 0, "ipfs://p");
    await vault.connect(alice).requestRedeem(HALF_BTC, BTC_ADDRESS_A);
    expect(await cbtc.balanceOf(alice.address)).to.equal(HALF_BTC);

    // The runbook's stop conditions pause the protocol precisely when the reserve
    // publication goes stale, and the updater may be the failed/compromised component.
    // Returning an unpayable redemption must not depend on refreshing the oracle.
    await time.increase(12 * 60 * 60 + 1);
    await vault.connect(admin).pause();

    await expect(vault.connect(admin).cancelRedeem(1n)).to.emit(vault, "RedeemCancelled");
    expect(await cbtc.balanceOf(alice.address)).to.equal(ONE_BTC);
    expect(await vault.pendingRedemptionSats()).to.equal(0n);
  });

  it("restricts restore to BURNER_ROLE and keeps it inside reserves and the pilot cap", async () => {
    const { vault, cbtc, oracle, admin, alice, mallory } = await deployFixture();
    await oracle.updateReserves(ONE_BTC, "ipfs://r");
    await vault.processDeposit(alice.address, ONE_BTC, ethers.id("deposit-a"), 0, "ipfs://p");
    await vault.connect(alice).requestRedeem(HALF_BTC, BTC_ADDRESS_A);

    // Only the vault (BURNER_ROLE) may restore burned supply.
    await expect(cbtc.connect(mallory).restore(mallory.address, HALF_BTC)).to.be.reverted;

    // Supply is now 0.5 cBTC with 0.5 pending. If custody has since shrunk, restoring
    // past the last attested reserves is refused even for the role holder.
    await cbtc.connect(admin).grantRole(await cbtc.BURNER_ROLE(), admin.address);
    await oracle.connect(admin).updateReserves(QUARTER_BTC, "ipfs://r2");
    await expect(cbtc.connect(admin).restore(alice.address, HALF_BTC))
      .to.be.revertedWithCustomError(cbtc, "ExceedsReserves");

    // ...and with reserves no longer binding, the immutable one-BTC ceiling still is.
    await oracle.connect(admin).updateReserves(10n * ONE_BTC, "ipfs://r3");
    await expect(cbtc.connect(admin).restore(alice.address, ONE_BTC))
      .to.be.revertedWithCustomError(cbtc, "ExceedsPilotSupplyCap");
  });

  it("fails closed on invalid custody references and supports emergency pause", async () => {
    const { vault, oracle, admin, alice } = await deployFixture();
    await oracle.updateReserves(ONE_BTC, "ipfs://r");

    await expect(vault.connect(admin).setRegistry(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(vault, "ZeroAddress");
    await expect(
      vault.processDeposit(alice.address, ONE_BTC, ethers.ZeroHash, 0, "ipfs://p")
    ).to.be.revertedWithCustomError(vault, "InvalidDepositReference");

    await vault.connect(admin).pause();
    await expect(
      vault.processDeposit(alice.address, ONE_BTC, ethers.id("deposit"), 0, "ipfs://p")
    ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    await vault.connect(admin).unpause();
    await expect(
      vault.processDeposit(alice.address, ONE_BTC, ethers.id("deposit"), 0, "ipfs://p")
    ).to.not.be.reverted;
    await expect(vault.connect(alice).requestRedeem(1n, "bad"))
      .to.be.revertedWithCustomError(vault, "InvalidPayoutAddress");
  });
});

describe("End-to-end: clean mint -> transfer -> redeem", () => {
  it("runs the full lifecycle with reserves fully backing supply", async () => {
    const { vault, cbtc, oracle, registry, admin, alice, bob } = await deployFixture();

    // Custodian attests one BTC of reserves: the full pilot ceiling.
    await oracle.updateReserves(ONE_BTC, "ipfs://reserves-latest");

    // Screened deposit -> mint one cBTC to Alice.
    await registry.connect(admin).attest(alice.address, 95, false, 0, "ipfs://clean-alice");
    await vault.processDeposit(alice.address, ONE_BTC, ethers.id("btc-in"), 0, "ipfs://prov");

    // Solvency holds: supply <= reserves.
    expect(await cbtc.totalSupply()).to.equal(ONE_BTC);
    expect(await cbtc.totalSupply()).to.be.lte(await oracle.reserveSats());

    // Alice sends 0.25 cBTC to Bob (MONITOR mode: open transfer).
    await cbtc.connect(alice).transfer(bob.address, QUARTER_BTC);

    // Alice redeems her remaining 0.75 cBTC for BTC.
    await vault.connect(alice).requestRedeem(3n * QUARTER_BTC, BTC_ADDRESS_A);
    await vault.connect(admin).settleRedeem(1n, ethers.id("btc-out"));

    expect(await cbtc.balanceOf(alice.address)).to.equal(0n);
    expect(await cbtc.balanceOf(bob.address)).to.equal(QUARTER_BTC);
    expect(await cbtc.totalSupply()).to.equal(QUARTER_BTC);
  });
});
