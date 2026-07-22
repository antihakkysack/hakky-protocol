"use strict";
export const launchV2 = validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"https://hakky.xyz/schemas/web/launch-v2.schema.json","title":"HAKKY public launch record v2","oneOf":[{"$ref":"#/$defs/prelaunchRecord"},{"$ref":"#/$defs/curveUnavailableRecord"},{"$ref":"#/$defs/curveVerifiedRecord"},{"$ref":"#/$defs/graduatedUnavailableRecord"},{"$ref":"#/$defs/graduatedVerifiedRecord"}],"$defs":{"publicKey":{"type":"string","pattern":"^[1-9A-HJ-NP-Za-km-z]{32,44}$"},"signature":{"type":"string","pattern":"^[1-9A-HJ-NP-Za-km-z]{64,88}$"},"sha256":{"type":"string","pattern":"^[0-9a-f]{64}$"},"unsignedDecimal":{"type":"string","pattern":"^(0|[1-9][0-9]*)$"},"timestamp":{"type":"string","pattern":"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"},"slot":{"type":"integer","minimum":0,"maximum":9007199254740991},"rpcHost":{"type":"string","pattern":"^(?=.{1,253}$)(?!.*(?:^|\\.)(?:localhost|local|test|invalid|example)(?:\\.|$))(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$"},"contentUri":{"type":"string","pattern":"^ipfs://b[a-z2-7]{10,}$"},"project":{"type":"object","additionalProperties":false,"required":["name","symbol","agent","website","x"],"properties":{"name":{"const":"Hakky Protocol"},"symbol":{"const":"HAKKY"},"agent":{"const":"HakkyAgent"},"website":{"const":"https://hakky.xyz"},"x":{"const":"https://x.com/antihakkysack"}}},"unavailableToken":{"type":"object","additionalProperties":false,"required":["mint","supplyBaseUnits","uiSupply","decimals","tokenProgram"],"properties":{"mint":{"type":"null"},"supplyBaseUnits":{"const":"1000000000000"},"uiSupply":{"const":"1000000"},"decimals":{"const":6},"tokenProgram":{"const":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}}},"verifiedToken":{"type":"object","additionalProperties":false,"required":["mint","supplyBaseUnits","uiSupply","decimals","tokenProgram"],"properties":{"mint":{"$ref":"#/$defs/publicKey"},"supplyBaseUnits":{"const":"1000000000000"},"uiSupply":{"const":"1000000"},"decimals":{"const":6},"tokenProgram":{"const":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}}},"launch":{"type":"object","additionalProperties":false,"required":["venue","quoteSymbol","publicCurveBps","liquidityBps","teamBps","creatorFirstBuyLamports","vestingBaseUnits","creatorDebitCapLamports"],"properties":{"venue":{"const":"Raydium LaunchLab"},"quoteSymbol":{"const":"SOL"},"publicCurveBps":{"const":8000},"liquidityBps":{"const":2000},"teamBps":{"const":0},"creatorFirstBuyLamports":{"const":"0"},"vestingBaseUnits":{"const":"0"},"creatorDebitCapLamports":{"const":"1000000000"}}},"prelaunchRecord":{"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"prelaunch"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/unavailableToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"type":"null"}}},"curveUnavailableRecord":{"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"curve-live"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/unavailableToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"$ref":"#/$defs/curveUnavailableProof"}}},"curveVerifiedRecord":{"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"curve-live"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/verifiedToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"$ref":"#/$defs/curveVerifiedProof"}}},"graduatedUnavailableRecord":{"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"graduated"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/unavailableToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"$ref":"#/$defs/graduatedUnavailableProof"}}},"graduatedVerifiedRecord":{"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"graduated"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/verifiedToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"$ref":"#/$defs/graduatedVerifiedProof"}}},"curveUnavailableProof":{"type":"object","additionalProperties":false,"required":["stage","availability"],"properties":{"stage":{"const":"curve-live"},"availability":{"const":"unavailable"}}},"graduatedUnavailableProof":{"type":"object","additionalProperties":false,"required":["stage","availability"],"properties":{"stage":{"const":"graduated"},"availability":{"const":"unavailable"}}},"mintArtifact":{"type":"object","additionalProperties":false,"required":["path","sha256","schemaVersion"],"properties":{"path":{"const":"proof/mainnet-mint.json"},"sha256":{"$ref":"#/$defs/sha256"},"schemaVersion":{"const":2}}},"launchlabArtifact":{"type":"object","additionalProperties":false,"required":["path","sha256","schemaVersion"],"properties":{"path":{"const":"proof/mainnet-launchlab.json"},"sha256":{"$ref":"#/$defs/sha256"},"schemaVersion":{"const":2}}},"graduationArtifact":{"type":"object","additionalProperties":false,"required":["path","sha256","schemaVersion"],"properties":{"path":{"const":"proof/mainnet-graduation.json"},"sha256":{"$ref":"#/$defs/sha256"},"schemaVersion":{"const":1}}},"curveSourceArtifacts":{"type":"object","additionalProperties":false,"required":["mint","launchlab"],"properties":{"mint":{"$ref":"#/$defs/mintArtifact"},"launchlab":{"$ref":"#/$defs/launchlabArtifact"}}},"graduatedSourceArtifacts":{"type":"object","additionalProperties":false,"required":["mint","launchlab","graduation"],"properties":{"mint":{"$ref":"#/$defs/mintArtifact"},"launchlab":{"$ref":"#/$defs/launchlabArtifact"},"graduation":{"$ref":"#/$defs/graduationArtifact"}}},"observation":{"type":"object","additionalProperties":false,"required":["finalizedSlot","finalizedAt","checkedAt","rpcHost"],"properties":{"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"},"checkedAt":{"$ref":"#/$defs/timestamp"},"rpcHost":{"$ref":"#/$defs/rpcHost"}}},"supply":{"type":"object","additionalProperties":false,"required":["baseUnits","uiAmount","decimals","tokenProgram"],"properties":{"baseUnits":{"const":"1000000000000"},"uiAmount":{"const":"1000000"},"decimals":{"const":6},"tokenProgram":{"const":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}}},"curveAuthorities":{"type":"object","additionalProperties":false,"required":["mintAuthority","authorityKind","freezeAuthority"],"properties":{"mintAuthority":{"const":"WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh"},"authorityKind":{"const":"launchlab-program-pda"},"freezeAuthority":{"type":"null"}}},"graduatedAuthorities":{"type":"object","additionalProperties":false,"required":["mintAuthority","authorityKind","freezeAuthority"],"properties":{"mintAuthority":{"type":"null"},"authorityKind":{"type":"null"},"freezeAuthority":{"type":"null"}}},"creatorBalanceAccount":{"type":"object","additionalProperties":false,"required":["address","mint","owner","amountBaseUnits","state","accountSha256"],"properties":{"address":{"$ref":"#/$defs/publicKey"},"mint":{"$ref":"#/$defs/publicKey"},"owner":{"$ref":"#/$defs/publicKey"},"amountBaseUnits":{"$ref":"#/$defs/unsignedDecimal"},"state":{"enum":["initialized","frozen"]},"accountSha256":{"$ref":"#/$defs/sha256"}}},"creatorBalance":{"type":"object","additionalProperties":false,"required":["owner","accounts","totalAmountBaseUnits","finalizedSlot","finalizedAt"],"properties":{"owner":{"$ref":"#/$defs/publicKey"},"accounts":{"type":"array","items":{"$ref":"#/$defs/creatorBalanceAccount"}},"totalAmountBaseUnits":{"$ref":"#/$defs/unsignedDecimal"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}},"allocations":{"type":"object","additionalProperties":false,"required":["publicCurveBaseUnits","publicCurveBps","liquidityBaseUnits","liquidityBps","teamBaseUnits","teamBps","totalBps"],"properties":{"publicCurveBaseUnits":{"const":"800000000000"},"publicCurveBps":{"const":8000},"liquidityBaseUnits":{"const":"200000000000"},"liquidityBps":{"const":2000},"teamBaseUnits":{"const":"0"},"teamBps":{"const":0},"totalBps":{"const":10000}}},"quote":{"type":"object","additionalProperties":false,"required":["mint","symbol","decimals","fundraisingLamports","graduationThresholdLamports"],"properties":{"mint":{"const":"So11111111111111111111111111111111111111112"},"symbol":{"const":"SOL"},"decimals":{"const":9},"fundraisingLamports":{"$ref":"#/$defs/unsignedDecimal"},"graduationThresholdLamports":{"$ref":"#/$defs/unsignedDecimal"}}},"creatorFirstBuy":{"type":"object","additionalProperties":false,"required":["creatorLamports","creatorTokenBaseUnits"],"properties":{"creatorLamports":{"const":"0"},"creatorTokenBaseUnits":{"const":"0"}}},"vesting":{"type":"object","additionalProperties":false,"required":["lockedBaseUnits","cliffSeconds","unlockSeconds"],"properties":{"lockedBaseUnits":{"const":"0"},"cliffSeconds":{"const":"0"},"unlockSeconds":{"const":"0"}}},"fees":{"type":"object","additionalProperties":false,"required":["protocolBuyFeeRateMillionths","protocolSellFeeRateMillionths","feeRateDenominator","creatorTradingFeeRateMillionths","creatorFeeKey","creatorFeeRights","snapshotImmutable"],"properties":{"protocolBuyFeeRateMillionths":{"$ref":"#/$defs/unsignedDecimal"},"protocolSellFeeRateMillionths":{"$ref":"#/$defs/unsignedDecimal"},"feeRateDenominator":{"const":"1000000"},"creatorTradingFeeRateMillionths":{"const":"0"},"creatorFeeKey":{"type":"null"},"creatorFeeRights":{"const":false},"snapshotImmutable":{"const":true}}},"curveCost":{"type":"object","additionalProperties":false,"required":["metadataUploadLamports","creationDebitLamports","recoveryDebitLamports","graduationDebitLamports","cumulativeCreatorDebitLamports","capLamports","withinCap"],"properties":{"metadataUploadLamports":{"$ref":"#/$defs/unsignedDecimal"},"creationDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"recoveryDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"graduationDebitLamports":{"const":"0"},"cumulativeCreatorDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"capLamports":{"const":"1000000000"},"withinCap":{"const":true}}},"graduatedCost":{"type":"object","additionalProperties":false,"required":["metadataUploadLamports","creationDebitLamports","recoveryDebitLamports","graduationDebitLamports","cumulativeCreatorDebitLamports","capLamports","withinCap"],"properties":{"metadataUploadLamports":{"$ref":"#/$defs/unsignedDecimal"},"creationDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"recoveryDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"graduationDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"cumulativeCreatorDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"capLamports":{"const":"1000000000"},"withinCap":{"const":true}}},"metadata":{"type":"object","additionalProperties":false,"required":["name","symbol","uri","metadataAccount","metadataAccountSha256","jsonSha256","imageUri","imageSha256","externalUrl","twitter","updateAuthority","isMutable"],"properties":{"name":{"const":"Hakky Protocol"},"symbol":{"const":"HAKKY"},"uri":{"$ref":"#/$defs/contentUri"},"metadataAccount":{"$ref":"#/$defs/publicKey"},"metadataAccountSha256":{"$ref":"#/$defs/sha256"},"jsonSha256":{"$ref":"#/$defs/sha256"},"imageUri":{"$ref":"#/$defs/contentUri"},"imageSha256":{"$ref":"#/$defs/sha256"},"externalUrl":{"const":"https://hakky.xyz"},"twitter":{"const":"https://x.com/antihakkysack"},"updateAuthority":{"$ref":"#/$defs/publicKey"},"isMutable":{"const":false}}},"transaction":{"type":"object","additionalProperties":false,"required":["signature","finalizedSlot","finalizedAt"],"properties":{"signature":{"$ref":"#/$defs/signature"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}},"curveTransactions":{"type":"object","additionalProperties":false,"required":["creation"],"properties":{"creation":{"$ref":"#/$defs/transaction"}}},"graduatedTransactions":{"type":"object","additionalProperties":false,"required":["creation","graduation"],"properties":{"creation":{"$ref":"#/$defs/transaction"},"graduation":{"$ref":"#/$defs/transaction"}}},"curveLinks":{"type":"object","additionalProperties":false,"required":["solscanMint","solscanCreationTransaction","raydiumLaunchlab"],"properties":{"solscanMint":{"type":"string","pattern":"^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},"solscanCreationTransaction":{"type":"string","pattern":"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},"raydiumLaunchlab":{"type":"string","pattern":"^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"}}},"graduatedLinks":{"type":"object","additionalProperties":false,"required":["solscanMint","solscanCreationTransaction","solscanGraduationTransaction","raydiumLaunchlab","raydiumPool"],"properties":{"solscanMint":{"type":"string","pattern":"^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},"solscanCreationTransaction":{"type":"string","pattern":"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},"solscanGraduationTransaction":{"type":"string","pattern":"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},"raydiumLaunchlab":{"type":"string","pattern":"^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},"raydiumPool":{"type":"string","pattern":"^https://raydium\\.io/liquidity-pools/[1-9A-HJ-NP-Za-km-z]{32,44}$"}}},"graduation":{"type":"object","additionalProperties":false,"required":["configuredThresholdLamports","observedQuoteBalanceLamports","status","finalizedSlot","finalizedAt"],"properties":{"configuredThresholdLamports":{"$ref":"#/$defs/unsignedDecimal"},"observedQuoteBalanceLamports":{"$ref":"#/$defs/unsignedDecimal"},"status":{"const":"graduated"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}},"pool":{"type":"object","additionalProperties":false,"required":["address","programId","quoteVault","quoteVaultBalanceLamports","accountSha256"],"properties":{"address":{"$ref":"#/$defs/publicKey"},"programId":{"enum":["CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C","675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"]},"quoteVault":{"$ref":"#/$defs/publicKey"},"quoteVaultBalanceLamports":{"$ref":"#/$defs/unsignedDecimal"},"accountSha256":{"$ref":"#/$defs/sha256"}}},"cpmmEvidenceAccount":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"enum":["lp-mint","locked-position","lock-nft-mint","lock-nft-token-account","lock-vault","fee-right-account"]},"address":{"$ref":"#/$defs/publicKey"},"ownerProgram":{"$ref":"#/$defs/publicKey"},"accountSha256":{"$ref":"#/$defs/sha256"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}},"ammEvidenceAccount":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"enum":["lp-mint","burn-source","creator-lp-account","platform-lp-account","withdrawal-queue","fee-right-account"]},"address":{"$ref":"#/$defs/publicKey"},"ownerProgram":{"$ref":"#/$defs/publicKey"},"accountSha256":{"$ref":"#/$defs/sha256"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}},"cpmmEvidenceAccounts":{"type":"array","minItems":6,"maxItems":6,"items":{"$ref":"#/$defs/cpmmEvidenceAccount"},"allOf":[{"contains":{"$ref":"#/$defs/cpmmRoleLpMint"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleLockedPosition"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleLockNftMint"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleLockNftTokenAccount"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleLockVault"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleFeeRightAccount"},"minContains":1,"maxContains":1}]},"ammEvidenceAccounts":{"type":"array","minItems":6,"maxItems":6,"items":{"$ref":"#/$defs/ammEvidenceAccount"},"allOf":[{"contains":{"$ref":"#/$defs/ammRoleLpMint"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRoleBurnSource"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRoleCreatorLpAccount"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRolePlatformLpAccount"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRoleWithdrawalQueue"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRoleFeeRightAccount"},"minContains":1,"maxContains":1}]},"cpmmRoleLpMint":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lp-mint"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"cpmmRoleLockedPosition":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"locked-position"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"cpmmRoleLockNftMint":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lock-nft-mint"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"cpmmRoleLockNftTokenAccount":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lock-nft-token-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"cpmmRoleLockVault":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lock-vault"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"cpmmRoleFeeRightAccount":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"fee-right-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"ammRoleLpMint":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lp-mint"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"ammRoleBurnSource":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"burn-source"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"ammRoleCreatorLpAccount":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"creator-lp-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"ammRolePlatformLpAccount":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"platform-lp-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"ammRoleWithdrawalQueue":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"withdrawal-queue"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"ammRoleFeeRightAccount":{"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"fee-right-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}},"lpDisposition":{"oneOf":[{"type":"object","additionalProperties":false,"required":["kind","lpMint","lockedPosition","lockProgram","lockNftMint","lockNftTokenAccount","lockVault","platformLpBps","creatorLpBps","irreversibleLpBps","withdrawalAuthority","feeKey","feeRights","recoverableLpBaseUnits","evidenceAccounts"],"properties":{"kind":{"const":"burn-and-earn"},"lpMint":{"$ref":"#/$defs/publicKey"},"lockedPosition":{"$ref":"#/$defs/publicKey"},"lockProgram":{"const":"LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE"},"lockNftMint":{"$ref":"#/$defs/publicKey"},"lockNftTokenAccount":{"$ref":"#/$defs/publicKey"},"lockVault":{"$ref":"#/$defs/publicKey"},"platformLpBps":{"const":0},"creatorLpBps":{"const":0},"irreversibleLpBps":{"const":10000},"withdrawalAuthority":{"type":"null"},"feeKey":{"type":"null"},"feeRights":{"type":"array","maxItems":0},"recoverableLpBaseUnits":{"const":"0"},"evidenceAccounts":{"$ref":"#/$defs/cpmmEvidenceAccounts"}}},{"type":"object","additionalProperties":false,"required":["kind","lpMint","burnedBaseUnits","totalSupplyBaseUnits","creatorLpBaseUnits","platformLpBaseUnits","recoverableLpBaseUnits","withdrawalAuthority","feeKey","feeRights","evidenceAccounts"],"properties":{"kind":{"const":"lp-burn"},"lpMint":{"$ref":"#/$defs/publicKey"},"burnedBaseUnits":{"$ref":"#/$defs/unsignedDecimal"},"totalSupplyBaseUnits":{"$ref":"#/$defs/unsignedDecimal"},"creatorLpBaseUnits":{"const":"0"},"platformLpBaseUnits":{"const":"0"},"recoverableLpBaseUnits":{"const":"0"},"withdrawalAuthority":{"type":"null"},"feeKey":{"type":"null"},"feeRights":{"type":"array","maxItems":0},"evidenceAccounts":{"$ref":"#/$defs/ammEvidenceAccounts"}}}]},"curveVerifiedProof":{"type":"object","additionalProperties":false,"required":["stage","availability","sourceArtifacts","observation","supply","authorities","creatorBalance","allocations","quote","creatorFirstBuy","vesting","fees","cost","metadata","transactions","links"],"properties":{"stage":{"const":"curve-live"},"availability":{"const":"verified"},"sourceArtifacts":{"$ref":"#/$defs/curveSourceArtifacts"},"observation":{"$ref":"#/$defs/observation"},"supply":{"$ref":"#/$defs/supply"},"authorities":{"$ref":"#/$defs/curveAuthorities"},"creatorBalance":{"$ref":"#/$defs/creatorBalance"},"allocations":{"$ref":"#/$defs/allocations"},"quote":{"$ref":"#/$defs/quote"},"creatorFirstBuy":{"$ref":"#/$defs/creatorFirstBuy"},"vesting":{"$ref":"#/$defs/vesting"},"fees":{"$ref":"#/$defs/fees"},"cost":{"$ref":"#/$defs/curveCost"},"metadata":{"$ref":"#/$defs/metadata"},"transactions":{"$ref":"#/$defs/curveTransactions"},"links":{"$ref":"#/$defs/curveLinks"}}},"graduatedVerifiedProof":{"type":"object","additionalProperties":false,"required":["stage","availability","sourceArtifacts","observation","supply","authorities","creatorBalance","allocations","quote","creatorFirstBuy","vesting","fees","cost","metadata","transactions","links","graduation","pool","lpDisposition"],"properties":{"stage":{"const":"graduated"},"availability":{"const":"verified"},"sourceArtifacts":{"$ref":"#/$defs/graduatedSourceArtifacts"},"observation":{"$ref":"#/$defs/observation"},"supply":{"$ref":"#/$defs/supply"},"authorities":{"$ref":"#/$defs/graduatedAuthorities"},"creatorBalance":{"$ref":"#/$defs/creatorBalance"},"allocations":{"$ref":"#/$defs/allocations"},"quote":{"$ref":"#/$defs/quote"},"creatorFirstBuy":{"$ref":"#/$defs/creatorFirstBuy"},"vesting":{"$ref":"#/$defs/vesting"},"fees":{"$ref":"#/$defs/fees"},"cost":{"$ref":"#/$defs/graduatedCost"},"metadata":{"$ref":"#/$defs/metadata"},"transactions":{"$ref":"#/$defs/graduatedTransactions"},"links":{"$ref":"#/$defs/graduatedLinks"},"graduation":{"$ref":"#/$defs/graduation"},"pool":{"$ref":"#/$defs/pool"},"lpDisposition":{"$ref":"#/$defs/lpDisposition"}}}}};
const schema32 = {"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"prelaunch"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/unavailableToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"type":"null"}}};
const schema33 = {"type":"object","additionalProperties":false,"required":["name","symbol","agent","website","x"],"properties":{"name":{"const":"Hakky Protocol"},"symbol":{"const":"HAKKY"},"agent":{"const":"HakkyAgent"},"website":{"const":"https://hakky.xyz"},"x":{"const":"https://x.com/antihakkysack"}}};
const schema34 = {"type":"object","additionalProperties":false,"required":["mint","supplyBaseUnits","uiSupply","decimals","tokenProgram"],"properties":{"mint":{"type":"null"},"supplyBaseUnits":{"const":"1000000000000"},"uiSupply":{"const":"1000000"},"decimals":{"const":6},"tokenProgram":{"const":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}}};
const schema35 = {"type":"object","additionalProperties":false,"required":["venue","quoteSymbol","publicCurveBps","liquidityBps","teamBps","creatorFirstBuyLamports","vestingBaseUnits","creatorDebitCapLamports"],"properties":{"venue":{"const":"Raydium LaunchLab"},"quoteSymbol":{"const":"SOL"},"publicCurveBps":{"const":8000},"liquidityBps":{"const":2000},"teamBps":{"const":0},"creatorFirstBuyLamports":{"const":"0"},"vestingBaseUnits":{"const":"0"},"creatorDebitCapLamports":{"const":"1000000000"}}};

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate21.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.status === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.network === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "network"},message:"must have required property '"+"network"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.project === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "project"},message:"must have required property '"+"project"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.token === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "token"},message:"must have required property '"+"token"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.launch === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "launch"},message:"must have required property '"+"launch"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.proof === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proof"},message:"must have required property '"+"proof"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "schemaVersion") || (key0 === "status")) || (key0 === "network")) || (key0 === "project")) || (key0 === "token")) || (key0 === "launch")) || (key0 === "proof"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(2 !== data.schemaVersion){
const err8 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.status !== undefined){
if("prelaunch" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "prelaunch"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.network !== undefined){
if("mainnet-beta" !== data.network){
const err10 = {instancePath:instancePath+"/network",schemaPath:"#/properties/network/const",keyword:"const",params:{allowedValue: "mainnet-beta"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.project !== undefined){
let data3 = data.project;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.name === undefined){
const err11 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3.symbol === undefined){
const err12 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "symbol"},message:"must have required property '"+"symbol"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data3.agent === undefined){
const err13 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "agent"},message:"must have required property '"+"agent"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data3.website === undefined){
const err14 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "website"},message:"must have required property '"+"website"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data3.x === undefined){
const err15 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "x"},message:"must have required property '"+"x"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key1 in data3){
if(!(((((key1 === "name") || (key1 === "symbol")) || (key1 === "agent")) || (key1 === "website")) || (key1 === "x"))){
const err16 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data3.name !== undefined){
if("Hakky Protocol" !== data3.name){
const err17 = {instancePath:instancePath+"/project/name",schemaPath:"#/$defs/project/properties/name/const",keyword:"const",params:{allowedValue: "Hakky Protocol"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data3.symbol !== undefined){
if("HAKKY" !== data3.symbol){
const err18 = {instancePath:instancePath+"/project/symbol",schemaPath:"#/$defs/project/properties/symbol/const",keyword:"const",params:{allowedValue: "HAKKY"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data3.agent !== undefined){
if("HakkyAgent" !== data3.agent){
const err19 = {instancePath:instancePath+"/project/agent",schemaPath:"#/$defs/project/properties/agent/const",keyword:"const",params:{allowedValue: "HakkyAgent"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data3.website !== undefined){
if("https://hakky.xyz" !== data3.website){
const err20 = {instancePath:instancePath+"/project/website",schemaPath:"#/$defs/project/properties/website/const",keyword:"const",params:{allowedValue: "https://hakky.xyz"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data3.x !== undefined){
if("https://x.com/antihakkysack" !== data3.x){
const err21 = {instancePath:instancePath+"/project/x",schemaPath:"#/$defs/project/properties/x/const",keyword:"const",params:{allowedValue: "https://x.com/antihakkysack"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
else {
const err22 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.token !== undefined){
let data9 = data.token;
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.mint === undefined){
const err23 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "mint"},message:"must have required property '"+"mint"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data9.supplyBaseUnits === undefined){
const err24 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "supplyBaseUnits"},message:"must have required property '"+"supplyBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data9.uiSupply === undefined){
const err25 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "uiSupply"},message:"must have required property '"+"uiSupply"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data9.decimals === undefined){
const err26 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "decimals"},message:"must have required property '"+"decimals"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data9.tokenProgram === undefined){
const err27 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "tokenProgram"},message:"must have required property '"+"tokenProgram"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
for(const key2 in data9){
if(!(((((key2 === "mint") || (key2 === "supplyBaseUnits")) || (key2 === "uiSupply")) || (key2 === "decimals")) || (key2 === "tokenProgram"))){
const err28 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data9.mint !== undefined){
if(data9.mint !== null){
const err29 = {instancePath:instancePath+"/token/mint",schemaPath:"#/$defs/unavailableToken/properties/mint/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data9.supplyBaseUnits !== undefined){
if("1000000000000" !== data9.supplyBaseUnits){
const err30 = {instancePath:instancePath+"/token/supplyBaseUnits",schemaPath:"#/$defs/unavailableToken/properties/supplyBaseUnits/const",keyword:"const",params:{allowedValue: "1000000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data9.uiSupply !== undefined){
if("1000000" !== data9.uiSupply){
const err31 = {instancePath:instancePath+"/token/uiSupply",schemaPath:"#/$defs/unavailableToken/properties/uiSupply/const",keyword:"const",params:{allowedValue: "1000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data9.decimals !== undefined){
if(6 !== data9.decimals){
const err32 = {instancePath:instancePath+"/token/decimals",schemaPath:"#/$defs/unavailableToken/properties/decimals/const",keyword:"const",params:{allowedValue: 6},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data9.tokenProgram !== undefined){
if("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" !== data9.tokenProgram){
const err33 = {instancePath:instancePath+"/token/tokenProgram",schemaPath:"#/$defs/unavailableToken/properties/tokenProgram/const",keyword:"const",params:{allowedValue: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
else {
const err34 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.launch !== undefined){
let data15 = data.launch;
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.venue === undefined){
const err35 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "venue"},message:"must have required property '"+"venue"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data15.quoteSymbol === undefined){
const err36 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "quoteSymbol"},message:"must have required property '"+"quoteSymbol"+"'"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if(data15.publicCurveBps === undefined){
const err37 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "publicCurveBps"},message:"must have required property '"+"publicCurveBps"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data15.liquidityBps === undefined){
const err38 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "liquidityBps"},message:"must have required property '"+"liquidityBps"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data15.teamBps === undefined){
const err39 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "teamBps"},message:"must have required property '"+"teamBps"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data15.creatorFirstBuyLamports === undefined){
const err40 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorFirstBuyLamports"},message:"must have required property '"+"creatorFirstBuyLamports"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data15.vestingBaseUnits === undefined){
const err41 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "vestingBaseUnits"},message:"must have required property '"+"vestingBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data15.creatorDebitCapLamports === undefined){
const err42 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorDebitCapLamports"},message:"must have required property '"+"creatorDebitCapLamports"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
for(const key3 in data15){
if(!((((((((key3 === "venue") || (key3 === "quoteSymbol")) || (key3 === "publicCurveBps")) || (key3 === "liquidityBps")) || (key3 === "teamBps")) || (key3 === "creatorFirstBuyLamports")) || (key3 === "vestingBaseUnits")) || (key3 === "creatorDebitCapLamports"))){
const err43 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data15.venue !== undefined){
if("Raydium LaunchLab" !== data15.venue){
const err44 = {instancePath:instancePath+"/launch/venue",schemaPath:"#/$defs/launch/properties/venue/const",keyword:"const",params:{allowedValue: "Raydium LaunchLab"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data15.quoteSymbol !== undefined){
if("SOL" !== data15.quoteSymbol){
const err45 = {instancePath:instancePath+"/launch/quoteSymbol",schemaPath:"#/$defs/launch/properties/quoteSymbol/const",keyword:"const",params:{allowedValue: "SOL"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data15.publicCurveBps !== undefined){
if(8000 !== data15.publicCurveBps){
const err46 = {instancePath:instancePath+"/launch/publicCurveBps",schemaPath:"#/$defs/launch/properties/publicCurveBps/const",keyword:"const",params:{allowedValue: 8000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data15.liquidityBps !== undefined){
if(2000 !== data15.liquidityBps){
const err47 = {instancePath:instancePath+"/launch/liquidityBps",schemaPath:"#/$defs/launch/properties/liquidityBps/const",keyword:"const",params:{allowedValue: 2000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data15.teamBps !== undefined){
if(0 !== data15.teamBps){
const err48 = {instancePath:instancePath+"/launch/teamBps",schemaPath:"#/$defs/launch/properties/teamBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data15.creatorFirstBuyLamports !== undefined){
if("0" !== data15.creatorFirstBuyLamports){
const err49 = {instancePath:instancePath+"/launch/creatorFirstBuyLamports",schemaPath:"#/$defs/launch/properties/creatorFirstBuyLamports/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data15.vestingBaseUnits !== undefined){
if("0" !== data15.vestingBaseUnits){
const err50 = {instancePath:instancePath+"/launch/vestingBaseUnits",schemaPath:"#/$defs/launch/properties/vestingBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data15.creatorDebitCapLamports !== undefined){
if("1000000000" !== data15.creatorDebitCapLamports){
const err51 = {instancePath:instancePath+"/launch/creatorDebitCapLamports",schemaPath:"#/$defs/launch/properties/creatorDebitCapLamports/const",keyword:"const",params:{allowedValue: "1000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
else {
const err52 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data.proof !== undefined){
if(data.proof !== null){
const err53 = {instancePath:instancePath+"/proof",schemaPath:"#/properties/proof/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
}
else {
const err54 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
validate21.errors = vErrors;
return errors === 0;
}
validate21.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema36 = {"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"curve-live"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/unavailableToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"$ref":"#/$defs/curveUnavailableProof"}}};
const schema40 = {"type":"object","additionalProperties":false,"required":["stage","availability"],"properties":{"stage":{"const":"curve-live"},"availability":{"const":"unavailable"}}};

function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate23.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.status === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.network === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "network"},message:"must have required property '"+"network"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.project === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "project"},message:"must have required property '"+"project"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.token === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "token"},message:"must have required property '"+"token"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.launch === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "launch"},message:"must have required property '"+"launch"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.proof === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proof"},message:"must have required property '"+"proof"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "schemaVersion") || (key0 === "status")) || (key0 === "network")) || (key0 === "project")) || (key0 === "token")) || (key0 === "launch")) || (key0 === "proof"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(2 !== data.schemaVersion){
const err8 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.status !== undefined){
if("curve-live" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "curve-live"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.network !== undefined){
if("mainnet-beta" !== data.network){
const err10 = {instancePath:instancePath+"/network",schemaPath:"#/properties/network/const",keyword:"const",params:{allowedValue: "mainnet-beta"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.project !== undefined){
let data3 = data.project;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.name === undefined){
const err11 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3.symbol === undefined){
const err12 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "symbol"},message:"must have required property '"+"symbol"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data3.agent === undefined){
const err13 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "agent"},message:"must have required property '"+"agent"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data3.website === undefined){
const err14 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "website"},message:"must have required property '"+"website"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data3.x === undefined){
const err15 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "x"},message:"must have required property '"+"x"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key1 in data3){
if(!(((((key1 === "name") || (key1 === "symbol")) || (key1 === "agent")) || (key1 === "website")) || (key1 === "x"))){
const err16 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data3.name !== undefined){
if("Hakky Protocol" !== data3.name){
const err17 = {instancePath:instancePath+"/project/name",schemaPath:"#/$defs/project/properties/name/const",keyword:"const",params:{allowedValue: "Hakky Protocol"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data3.symbol !== undefined){
if("HAKKY" !== data3.symbol){
const err18 = {instancePath:instancePath+"/project/symbol",schemaPath:"#/$defs/project/properties/symbol/const",keyword:"const",params:{allowedValue: "HAKKY"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data3.agent !== undefined){
if("HakkyAgent" !== data3.agent){
const err19 = {instancePath:instancePath+"/project/agent",schemaPath:"#/$defs/project/properties/agent/const",keyword:"const",params:{allowedValue: "HakkyAgent"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data3.website !== undefined){
if("https://hakky.xyz" !== data3.website){
const err20 = {instancePath:instancePath+"/project/website",schemaPath:"#/$defs/project/properties/website/const",keyword:"const",params:{allowedValue: "https://hakky.xyz"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data3.x !== undefined){
if("https://x.com/antihakkysack" !== data3.x){
const err21 = {instancePath:instancePath+"/project/x",schemaPath:"#/$defs/project/properties/x/const",keyword:"const",params:{allowedValue: "https://x.com/antihakkysack"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
else {
const err22 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.token !== undefined){
let data9 = data.token;
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.mint === undefined){
const err23 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "mint"},message:"must have required property '"+"mint"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data9.supplyBaseUnits === undefined){
const err24 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "supplyBaseUnits"},message:"must have required property '"+"supplyBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data9.uiSupply === undefined){
const err25 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "uiSupply"},message:"must have required property '"+"uiSupply"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data9.decimals === undefined){
const err26 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "decimals"},message:"must have required property '"+"decimals"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data9.tokenProgram === undefined){
const err27 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "tokenProgram"},message:"must have required property '"+"tokenProgram"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
for(const key2 in data9){
if(!(((((key2 === "mint") || (key2 === "supplyBaseUnits")) || (key2 === "uiSupply")) || (key2 === "decimals")) || (key2 === "tokenProgram"))){
const err28 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data9.mint !== undefined){
if(data9.mint !== null){
const err29 = {instancePath:instancePath+"/token/mint",schemaPath:"#/$defs/unavailableToken/properties/mint/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data9.supplyBaseUnits !== undefined){
if("1000000000000" !== data9.supplyBaseUnits){
const err30 = {instancePath:instancePath+"/token/supplyBaseUnits",schemaPath:"#/$defs/unavailableToken/properties/supplyBaseUnits/const",keyword:"const",params:{allowedValue: "1000000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data9.uiSupply !== undefined){
if("1000000" !== data9.uiSupply){
const err31 = {instancePath:instancePath+"/token/uiSupply",schemaPath:"#/$defs/unavailableToken/properties/uiSupply/const",keyword:"const",params:{allowedValue: "1000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data9.decimals !== undefined){
if(6 !== data9.decimals){
const err32 = {instancePath:instancePath+"/token/decimals",schemaPath:"#/$defs/unavailableToken/properties/decimals/const",keyword:"const",params:{allowedValue: 6},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data9.tokenProgram !== undefined){
if("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" !== data9.tokenProgram){
const err33 = {instancePath:instancePath+"/token/tokenProgram",schemaPath:"#/$defs/unavailableToken/properties/tokenProgram/const",keyword:"const",params:{allowedValue: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
else {
const err34 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.launch !== undefined){
let data15 = data.launch;
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.venue === undefined){
const err35 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "venue"},message:"must have required property '"+"venue"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data15.quoteSymbol === undefined){
const err36 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "quoteSymbol"},message:"must have required property '"+"quoteSymbol"+"'"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if(data15.publicCurveBps === undefined){
const err37 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "publicCurveBps"},message:"must have required property '"+"publicCurveBps"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data15.liquidityBps === undefined){
const err38 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "liquidityBps"},message:"must have required property '"+"liquidityBps"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data15.teamBps === undefined){
const err39 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "teamBps"},message:"must have required property '"+"teamBps"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data15.creatorFirstBuyLamports === undefined){
const err40 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorFirstBuyLamports"},message:"must have required property '"+"creatorFirstBuyLamports"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data15.vestingBaseUnits === undefined){
const err41 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "vestingBaseUnits"},message:"must have required property '"+"vestingBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data15.creatorDebitCapLamports === undefined){
const err42 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorDebitCapLamports"},message:"must have required property '"+"creatorDebitCapLamports"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
for(const key3 in data15){
if(!((((((((key3 === "venue") || (key3 === "quoteSymbol")) || (key3 === "publicCurveBps")) || (key3 === "liquidityBps")) || (key3 === "teamBps")) || (key3 === "creatorFirstBuyLamports")) || (key3 === "vestingBaseUnits")) || (key3 === "creatorDebitCapLamports"))){
const err43 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data15.venue !== undefined){
if("Raydium LaunchLab" !== data15.venue){
const err44 = {instancePath:instancePath+"/launch/venue",schemaPath:"#/$defs/launch/properties/venue/const",keyword:"const",params:{allowedValue: "Raydium LaunchLab"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data15.quoteSymbol !== undefined){
if("SOL" !== data15.quoteSymbol){
const err45 = {instancePath:instancePath+"/launch/quoteSymbol",schemaPath:"#/$defs/launch/properties/quoteSymbol/const",keyword:"const",params:{allowedValue: "SOL"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data15.publicCurveBps !== undefined){
if(8000 !== data15.publicCurveBps){
const err46 = {instancePath:instancePath+"/launch/publicCurveBps",schemaPath:"#/$defs/launch/properties/publicCurveBps/const",keyword:"const",params:{allowedValue: 8000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data15.liquidityBps !== undefined){
if(2000 !== data15.liquidityBps){
const err47 = {instancePath:instancePath+"/launch/liquidityBps",schemaPath:"#/$defs/launch/properties/liquidityBps/const",keyword:"const",params:{allowedValue: 2000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data15.teamBps !== undefined){
if(0 !== data15.teamBps){
const err48 = {instancePath:instancePath+"/launch/teamBps",schemaPath:"#/$defs/launch/properties/teamBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data15.creatorFirstBuyLamports !== undefined){
if("0" !== data15.creatorFirstBuyLamports){
const err49 = {instancePath:instancePath+"/launch/creatorFirstBuyLamports",schemaPath:"#/$defs/launch/properties/creatorFirstBuyLamports/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data15.vestingBaseUnits !== undefined){
if("0" !== data15.vestingBaseUnits){
const err50 = {instancePath:instancePath+"/launch/vestingBaseUnits",schemaPath:"#/$defs/launch/properties/vestingBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data15.creatorDebitCapLamports !== undefined){
if("1000000000" !== data15.creatorDebitCapLamports){
const err51 = {instancePath:instancePath+"/launch/creatorDebitCapLamports",schemaPath:"#/$defs/launch/properties/creatorDebitCapLamports/const",keyword:"const",params:{allowedValue: "1000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
else {
const err52 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data.proof !== undefined){
let data24 = data.proof;
if(data24 && typeof data24 == "object" && !Array.isArray(data24)){
if(data24.stage === undefined){
const err53 = {instancePath:instancePath+"/proof",schemaPath:"#/$defs/curveUnavailableProof/required",keyword:"required",params:{missingProperty: "stage"},message:"must have required property '"+"stage"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data24.availability === undefined){
const err54 = {instancePath:instancePath+"/proof",schemaPath:"#/$defs/curveUnavailableProof/required",keyword:"required",params:{missingProperty: "availability"},message:"must have required property '"+"availability"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
for(const key4 in data24){
if(!((key4 === "stage") || (key4 === "availability"))){
const err55 = {instancePath:instancePath+"/proof",schemaPath:"#/$defs/curveUnavailableProof/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data24.stage !== undefined){
if("curve-live" !== data24.stage){
const err56 = {instancePath:instancePath+"/proof/stage",schemaPath:"#/$defs/curveUnavailableProof/properties/stage/const",keyword:"const",params:{allowedValue: "curve-live"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
if(data24.availability !== undefined){
if("unavailable" !== data24.availability){
const err57 = {instancePath:instancePath+"/proof/availability",schemaPath:"#/$defs/curveUnavailableProof/properties/availability/const",keyword:"const",params:{allowedValue: "unavailable"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
}
else {
const err58 = {instancePath:instancePath+"/proof",schemaPath:"#/$defs/curveUnavailableProof/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
}
else {
const err59 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
validate23.errors = vErrors;
return errors === 0;
}
validate23.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema41 = {"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"curve-live"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/verifiedToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"$ref":"#/$defs/curveVerifiedProof"}}};
const schema43 = {"type":"object","additionalProperties":false,"required":["mint","supplyBaseUnits","uiSupply","decimals","tokenProgram"],"properties":{"mint":{"$ref":"#/$defs/publicKey"},"supplyBaseUnits":{"const":"1000000000000"},"uiSupply":{"const":"1000000"},"decimals":{"const":6},"tokenProgram":{"const":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}}};
const schema44 = {"type":"string","pattern":"^[1-9A-HJ-NP-Za-km-z]{32,44}$"};
const pattern4 = new RegExp("^[1-9A-HJ-NP-Za-km-z]{32,44}$", "u");

function validate26(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate26.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.mint === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "mint"},message:"must have required property '"+"mint"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.supplyBaseUnits === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "supplyBaseUnits"},message:"must have required property '"+"supplyBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.uiSupply === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "uiSupply"},message:"must have required property '"+"uiSupply"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.decimals === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "decimals"},message:"must have required property '"+"decimals"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.tokenProgram === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "tokenProgram"},message:"must have required property '"+"tokenProgram"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key0 in data){
if(!(((((key0 === "mint") || (key0 === "supplyBaseUnits")) || (key0 === "uiSupply")) || (key0 === "decimals")) || (key0 === "tokenProgram"))){
const err5 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.mint !== undefined){
let data0 = data.mint;
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
const err6 = {instancePath:instancePath+"/mint",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/mint",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.supplyBaseUnits !== undefined){
if("1000000000000" !== data.supplyBaseUnits){
const err8 = {instancePath:instancePath+"/supplyBaseUnits",schemaPath:"#/properties/supplyBaseUnits/const",keyword:"const",params:{allowedValue: "1000000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.uiSupply !== undefined){
if("1000000" !== data.uiSupply){
const err9 = {instancePath:instancePath+"/uiSupply",schemaPath:"#/properties/uiSupply/const",keyword:"const",params:{allowedValue: "1000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.decimals !== undefined){
if(6 !== data.decimals){
const err10 = {instancePath:instancePath+"/decimals",schemaPath:"#/properties/decimals/const",keyword:"const",params:{allowedValue: 6},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.tokenProgram !== undefined){
if("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" !== data.tokenProgram){
const err11 = {instancePath:instancePath+"/tokenProgram",schemaPath:"#/properties/tokenProgram/const",keyword:"const",params:{allowedValue: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
}
else {
const err12 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
validate26.errors = vErrors;
return errors === 0;
}
validate26.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema46 = {"type":"object","additionalProperties":false,"required":["stage","availability","sourceArtifacts","observation","supply","authorities","creatorBalance","allocations","quote","creatorFirstBuy","vesting","fees","cost","metadata","transactions","links"],"properties":{"stage":{"const":"curve-live"},"availability":{"const":"verified"},"sourceArtifacts":{"$ref":"#/$defs/curveSourceArtifacts"},"observation":{"$ref":"#/$defs/observation"},"supply":{"$ref":"#/$defs/supply"},"authorities":{"$ref":"#/$defs/curveAuthorities"},"creatorBalance":{"$ref":"#/$defs/creatorBalance"},"allocations":{"$ref":"#/$defs/allocations"},"quote":{"$ref":"#/$defs/quote"},"creatorFirstBuy":{"$ref":"#/$defs/creatorFirstBuy"},"vesting":{"$ref":"#/$defs/vesting"},"fees":{"$ref":"#/$defs/fees"},"cost":{"$ref":"#/$defs/curveCost"},"metadata":{"$ref":"#/$defs/metadata"},"transactions":{"$ref":"#/$defs/curveTransactions"},"links":{"$ref":"#/$defs/curveLinks"}}};
const schema57 = {"type":"object","additionalProperties":false,"required":["baseUnits","uiAmount","decimals","tokenProgram"],"properties":{"baseUnits":{"const":"1000000000000"},"uiAmount":{"const":"1000000"},"decimals":{"const":6},"tokenProgram":{"const":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}}};
const schema58 = {"type":"object","additionalProperties":false,"required":["mintAuthority","authorityKind","freezeAuthority"],"properties":{"mintAuthority":{"const":"WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh"},"authorityKind":{"const":"launchlab-program-pda"},"freezeAuthority":{"type":"null"}}};
const schema70 = {"type":"object","additionalProperties":false,"required":["publicCurveBaseUnits","publicCurveBps","liquidityBaseUnits","liquidityBps","teamBaseUnits","teamBps","totalBps"],"properties":{"publicCurveBaseUnits":{"const":"800000000000"},"publicCurveBps":{"const":8000},"liquidityBaseUnits":{"const":"200000000000"},"liquidityBps":{"const":2000},"teamBaseUnits":{"const":"0"},"teamBps":{"const":0},"totalBps":{"const":10000}}};
const schema74 = {"type":"object","additionalProperties":false,"required":["creatorLamports","creatorTokenBaseUnits"],"properties":{"creatorLamports":{"const":"0"},"creatorTokenBaseUnits":{"const":"0"}}};
const schema75 = {"type":"object","additionalProperties":false,"required":["lockedBaseUnits","cliffSeconds","unlockSeconds"],"properties":{"lockedBaseUnits":{"const":"0"},"cliffSeconds":{"const":"0"},"unlockSeconds":{"const":"0"}}};
const schema97 = {"type":"object","additionalProperties":false,"required":["solscanMint","solscanCreationTransaction","raydiumLaunchlab"],"properties":{"solscanMint":{"type":"string","pattern":"^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},"solscanCreationTransaction":{"type":"string","pattern":"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},"raydiumLaunchlab":{"type":"string","pattern":"^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"}}};
const func1 = Object.prototype.hasOwnProperty;
const schema47 = {"type":"object","additionalProperties":false,"required":["mint","launchlab"],"properties":{"mint":{"$ref":"#/$defs/mintArtifact"},"launchlab":{"$ref":"#/$defs/launchlabArtifact"}}};
const schema48 = {"type":"object","additionalProperties":false,"required":["path","sha256","schemaVersion"],"properties":{"path":{"const":"proof/mainnet-mint.json"},"sha256":{"$ref":"#/$defs/sha256"},"schemaVersion":{"const":2}}};
const schema49 = {"type":"string","pattern":"^[0-9a-f]{64}$"};
const pattern5 = new RegExp("^[0-9a-f]{64}$", "u");

function validate30(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate30.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.path === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.sha256 === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.schemaVersion === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "path") || (key0 === "sha256")) || (key0 === "schemaVersion"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.path !== undefined){
if("proof/mainnet-mint.json" !== data.path){
const err4 = {instancePath:instancePath+"/path",schemaPath:"#/properties/path/const",keyword:"const",params:{allowedValue: "proof/mainnet-mint.json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.sha256 !== undefined){
let data1 = data.sha256;
if(typeof data1 === "string"){
if(!pattern5.test(data1)){
const err5 = {instancePath:instancePath+"/sha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/sha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(2 !== data.schemaVersion){
const err7 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
validate30.errors = vErrors;
return errors === 0;
}
validate30.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema50 = {"type":"object","additionalProperties":false,"required":["path","sha256","schemaVersion"],"properties":{"path":{"const":"proof/mainnet-launchlab.json"},"sha256":{"$ref":"#/$defs/sha256"},"schemaVersion":{"const":2}}};

function validate32(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate32.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.path === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.sha256 === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.schemaVersion === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "path") || (key0 === "sha256")) || (key0 === "schemaVersion"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.path !== undefined){
if("proof/mainnet-launchlab.json" !== data.path){
const err4 = {instancePath:instancePath+"/path",schemaPath:"#/properties/path/const",keyword:"const",params:{allowedValue: "proof/mainnet-launchlab.json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.sha256 !== undefined){
let data1 = data.sha256;
if(typeof data1 === "string"){
if(!pattern5.test(data1)){
const err5 = {instancePath:instancePath+"/sha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/sha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(2 !== data.schemaVersion){
const err7 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
validate32.errors = vErrors;
return errors === 0;
}
validate32.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate29(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate29.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.mint === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "mint"},message:"must have required property '"+"mint"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.launchlab === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "launchlab"},message:"must have required property '"+"launchlab"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "mint") || (key0 === "launchlab"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.mint !== undefined){
if(!(validate30(data.mint, {instancePath:instancePath+"/mint",parentData:data,parentDataProperty:"mint",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
}
if(data.launchlab !== undefined){
if(!(validate32(data.launchlab, {instancePath:instancePath+"/launchlab",parentData:data,parentDataProperty:"launchlab",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate29.errors = vErrors;
return errors === 0;
}
validate29.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema52 = {"type":"object","additionalProperties":false,"required":["finalizedSlot","finalizedAt","checkedAt","rpcHost"],"properties":{"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"},"checkedAt":{"$ref":"#/$defs/timestamp"},"rpcHost":{"$ref":"#/$defs/rpcHost"}}};
const schema53 = {"type":"integer","minimum":0,"maximum":9007199254740991};
const schema54 = {"type":"string","pattern":"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"};
const schema56 = {"type":"string","pattern":"^(?=.{1,253}$)(?!.*(?:^|\\.)(?:localhost|local|test|invalid|example)(?:\\.|$))(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$"};
const pattern7 = new RegExp("^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$", "u");
const pattern9 = new RegExp("^(?=.{1,253}$)(?!.*(?:^|\\.)(?:localhost|local|test|invalid|example)(?:\\.|$))(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$", "u");

function validate35(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate35.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.finalizedSlot === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.finalizedAt === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.checkedAt === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "checkedAt"},message:"must have required property '"+"checkedAt"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.rpcHost === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "rpcHost"},message:"must have required property '"+"rpcHost"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "finalizedSlot") || (key0 === "finalizedAt")) || (key0 === "checkedAt")) || (key0 === "rpcHost"))){
const err4 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.finalizedSlot !== undefined){
let data0 = data.finalizedSlot;
if(!(((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0))) && (isFinite(data0)))){
const err5 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if((typeof data0 == "number") && (isFinite(data0))){
if(data0 > 9007199254740991 || isNaN(data0)){
const err6 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data0 < 0 || isNaN(data0)){
const err7 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
if(data.finalizedAt !== undefined){
let data1 = data.finalizedAt;
if(typeof data1 === "string"){
if(!pattern7.test(data1)){
const err8 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.checkedAt !== undefined){
let data2 = data.checkedAt;
if(typeof data2 === "string"){
if(!pattern7.test(data2)){
const err10 = {instancePath:instancePath+"/checkedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/checkedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.rpcHost !== undefined){
let data3 = data.rpcHost;
if(typeof data3 === "string"){
if(!pattern9.test(data3)){
const err12 = {instancePath:instancePath+"/rpcHost",schemaPath:"#/$defs/rpcHost/pattern",keyword:"pattern",params:{pattern: "^(?=.{1,253}$)(?!.*(?:^|\\.)(?:localhost|local|test|invalid|example)(?:\\.|$))(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$"},message:"must match pattern \""+"^(?=.{1,253}$)(?!.*(?:^|\\.)(?:localhost|local|test|invalid|example)(?:\\.|$))(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/rpcHost",schemaPath:"#/$defs/rpcHost/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
}
else {
const err14 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
validate35.errors = vErrors;
return errors === 0;
}
validate35.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema59 = {"type":"object","additionalProperties":false,"required":["owner","accounts","totalAmountBaseUnits","finalizedSlot","finalizedAt"],"properties":{"owner":{"$ref":"#/$defs/publicKey"},"accounts":{"type":"array","items":{"$ref":"#/$defs/creatorBalanceAccount"}},"totalAmountBaseUnits":{"$ref":"#/$defs/unsignedDecimal"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}};
const schema65 = {"type":"string","pattern":"^(0|[1-9][0-9]*)$"};
const pattern14 = new RegExp("^(0|[1-9][0-9]*)$", "u");
const schema61 = {"type":"object","additionalProperties":false,"required":["address","mint","owner","amountBaseUnits","state","accountSha256"],"properties":{"address":{"$ref":"#/$defs/publicKey"},"mint":{"$ref":"#/$defs/publicKey"},"owner":{"$ref":"#/$defs/publicKey"},"amountBaseUnits":{"$ref":"#/$defs/unsignedDecimal"},"state":{"enum":["initialized","frozen"]},"accountSha256":{"$ref":"#/$defs/sha256"}}};

function validate38(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate38.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.address === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.mint === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "mint"},message:"must have required property '"+"mint"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.owner === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "owner"},message:"must have required property '"+"owner"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.amountBaseUnits === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "amountBaseUnits"},message:"must have required property '"+"amountBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.state === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "state"},message:"must have required property '"+"state"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.accountSha256 === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
for(const key0 in data){
if(!((((((key0 === "address") || (key0 === "mint")) || (key0 === "owner")) || (key0 === "amountBaseUnits")) || (key0 === "state")) || (key0 === "accountSha256"))){
const err6 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.address !== undefined){
let data0 = data.address;
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
const err7 = {instancePath:instancePath+"/address",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
else {
const err8 = {instancePath:instancePath+"/address",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.mint !== undefined){
let data1 = data.mint;
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
const err9 = {instancePath:instancePath+"/mint",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/mint",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.owner !== undefined){
let data2 = data.owner;
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
const err11 = {instancePath:instancePath+"/owner",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
else {
const err12 = {instancePath:instancePath+"/owner",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.amountBaseUnits !== undefined){
let data3 = data.amountBaseUnits;
if(typeof data3 === "string"){
if(!pattern14.test(data3)){
const err13 = {instancePath:instancePath+"/amountBaseUnits",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
else {
const err14 = {instancePath:instancePath+"/amountBaseUnits",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.state !== undefined){
let data4 = data.state;
if(!((data4 === "initialized") || (data4 === "frozen"))){
const err15 = {instancePath:instancePath+"/state",schemaPath:"#/properties/state/enum",keyword:"enum",params:{allowedValues: schema61.properties.state.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.accountSha256 !== undefined){
let data5 = data.accountSha256;
if(typeof data5 === "string"){
if(!pattern5.test(data5)){
const err16 = {instancePath:instancePath+"/accountSha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/accountSha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
validate38.errors = vErrors;
return errors === 0;
}
validate38.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate37(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate37.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.owner === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "owner"},message:"must have required property '"+"owner"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.accounts === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "accounts"},message:"must have required property '"+"accounts"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.totalAmountBaseUnits === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "totalAmountBaseUnits"},message:"must have required property '"+"totalAmountBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.finalizedSlot === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.finalizedAt === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key0 in data){
if(!(((((key0 === "owner") || (key0 === "accounts")) || (key0 === "totalAmountBaseUnits")) || (key0 === "finalizedSlot")) || (key0 === "finalizedAt"))){
const err5 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.owner !== undefined){
let data0 = data.owner;
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
const err6 = {instancePath:instancePath+"/owner",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/owner",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.accounts !== undefined){
let data1 = data.accounts;
if(Array.isArray(data1)){
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
if(!(validate38(data1[i0], {instancePath:instancePath+"/accounts/" + i0,parentData:data1,parentDataProperty:i0,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate38.errors : vErrors.concat(validate38.errors);
errors = vErrors.length;
}
}
}
else {
const err8 = {instancePath:instancePath+"/accounts",schemaPath:"#/properties/accounts/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.totalAmountBaseUnits !== undefined){
let data3 = data.totalAmountBaseUnits;
if(typeof data3 === "string"){
if(!pattern14.test(data3)){
const err9 = {instancePath:instancePath+"/totalAmountBaseUnits",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/totalAmountBaseUnits",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.finalizedSlot !== undefined){
let data4 = data.finalizedSlot;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
const err11 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740991 || isNaN(data4)){
const err12 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data4 < 0 || isNaN(data4)){
const err13 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
}
if(data.finalizedAt !== undefined){
let data5 = data.finalizedAt;
if(typeof data5 === "string"){
if(!pattern7.test(data5)){
const err14 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"+"\""};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
validate37.errors = vErrors;
return errors === 0;
}
validate37.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema71 = {"type":"object","additionalProperties":false,"required":["mint","symbol","decimals","fundraisingLamports","graduationThresholdLamports"],"properties":{"mint":{"const":"So11111111111111111111111111111111111111112"},"symbol":{"const":"SOL"},"decimals":{"const":9},"fundraisingLamports":{"$ref":"#/$defs/unsignedDecimal"},"graduationThresholdLamports":{"$ref":"#/$defs/unsignedDecimal"}}};

function validate41(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate41.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.mint === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "mint"},message:"must have required property '"+"mint"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.symbol === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "symbol"},message:"must have required property '"+"symbol"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.decimals === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "decimals"},message:"must have required property '"+"decimals"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.fundraisingLamports === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "fundraisingLamports"},message:"must have required property '"+"fundraisingLamports"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.graduationThresholdLamports === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "graduationThresholdLamports"},message:"must have required property '"+"graduationThresholdLamports"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key0 in data){
if(!(((((key0 === "mint") || (key0 === "symbol")) || (key0 === "decimals")) || (key0 === "fundraisingLamports")) || (key0 === "graduationThresholdLamports"))){
const err5 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.mint !== undefined){
if("So11111111111111111111111111111111111111112" !== data.mint){
const err6 = {instancePath:instancePath+"/mint",schemaPath:"#/properties/mint/const",keyword:"const",params:{allowedValue: "So11111111111111111111111111111111111111112"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.symbol !== undefined){
if("SOL" !== data.symbol){
const err7 = {instancePath:instancePath+"/symbol",schemaPath:"#/properties/symbol/const",keyword:"const",params:{allowedValue: "SOL"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.decimals !== undefined){
if(9 !== data.decimals){
const err8 = {instancePath:instancePath+"/decimals",schemaPath:"#/properties/decimals/const",keyword:"const",params:{allowedValue: 9},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.fundraisingLamports !== undefined){
let data3 = data.fundraisingLamports;
if(typeof data3 === "string"){
if(!pattern14.test(data3)){
const err9 = {instancePath:instancePath+"/fundraisingLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/fundraisingLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.graduationThresholdLamports !== undefined){
let data4 = data.graduationThresholdLamports;
if(typeof data4 === "string"){
if(!pattern14.test(data4)){
const err11 = {instancePath:instancePath+"/graduationThresholdLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
else {
const err12 = {instancePath:instancePath+"/graduationThresholdLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
else {
const err13 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
validate41.errors = vErrors;
return errors === 0;
}
validate41.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema76 = {"type":"object","additionalProperties":false,"required":["protocolBuyFeeRateMillionths","protocolSellFeeRateMillionths","feeRateDenominator","creatorTradingFeeRateMillionths","creatorFeeKey","creatorFeeRights","snapshotImmutable"],"properties":{"protocolBuyFeeRateMillionths":{"$ref":"#/$defs/unsignedDecimal"},"protocolSellFeeRateMillionths":{"$ref":"#/$defs/unsignedDecimal"},"feeRateDenominator":{"const":"1000000"},"creatorTradingFeeRateMillionths":{"const":"0"},"creatorFeeKey":{"type":"null"},"creatorFeeRights":{"const":false},"snapshotImmutable":{"const":true}}};

function validate43(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate43.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.protocolBuyFeeRateMillionths === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "protocolBuyFeeRateMillionths"},message:"must have required property '"+"protocolBuyFeeRateMillionths"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.protocolSellFeeRateMillionths === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "protocolSellFeeRateMillionths"},message:"must have required property '"+"protocolSellFeeRateMillionths"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.feeRateDenominator === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "feeRateDenominator"},message:"must have required property '"+"feeRateDenominator"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.creatorTradingFeeRateMillionths === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creatorTradingFeeRateMillionths"},message:"must have required property '"+"creatorTradingFeeRateMillionths"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.creatorFeeKey === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creatorFeeKey"},message:"must have required property '"+"creatorFeeKey"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.creatorFeeRights === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creatorFeeRights"},message:"must have required property '"+"creatorFeeRights"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.snapshotImmutable === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "snapshotImmutable"},message:"must have required property '"+"snapshotImmutable"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "protocolBuyFeeRateMillionths") || (key0 === "protocolSellFeeRateMillionths")) || (key0 === "feeRateDenominator")) || (key0 === "creatorTradingFeeRateMillionths")) || (key0 === "creatorFeeKey")) || (key0 === "creatorFeeRights")) || (key0 === "snapshotImmutable"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.protocolBuyFeeRateMillionths !== undefined){
let data0 = data.protocolBuyFeeRateMillionths;
if(typeof data0 === "string"){
if(!pattern14.test(data0)){
const err8 = {instancePath:instancePath+"/protocolBuyFeeRateMillionths",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/protocolBuyFeeRateMillionths",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.protocolSellFeeRateMillionths !== undefined){
let data1 = data.protocolSellFeeRateMillionths;
if(typeof data1 === "string"){
if(!pattern14.test(data1)){
const err10 = {instancePath:instancePath+"/protocolSellFeeRateMillionths",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/protocolSellFeeRateMillionths",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.feeRateDenominator !== undefined){
if("1000000" !== data.feeRateDenominator){
const err12 = {instancePath:instancePath+"/feeRateDenominator",schemaPath:"#/properties/feeRateDenominator/const",keyword:"const",params:{allowedValue: "1000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.creatorTradingFeeRateMillionths !== undefined){
if("0" !== data.creatorTradingFeeRateMillionths){
const err13 = {instancePath:instancePath+"/creatorTradingFeeRateMillionths",schemaPath:"#/properties/creatorTradingFeeRateMillionths/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.creatorFeeKey !== undefined){
if(data.creatorFeeKey !== null){
const err14 = {instancePath:instancePath+"/creatorFeeKey",schemaPath:"#/properties/creatorFeeKey/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.creatorFeeRights !== undefined){
if(false !== data.creatorFeeRights){
const err15 = {instancePath:instancePath+"/creatorFeeRights",schemaPath:"#/properties/creatorFeeRights/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.snapshotImmutable !== undefined){
if(true !== data.snapshotImmutable){
const err16 = {instancePath:instancePath+"/snapshotImmutable",schemaPath:"#/properties/snapshotImmutable/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
else {
const err17 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
validate43.errors = vErrors;
return errors === 0;
}
validate43.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema79 = {"type":"object","additionalProperties":false,"required":["metadataUploadLamports","creationDebitLamports","recoveryDebitLamports","graduationDebitLamports","cumulativeCreatorDebitLamports","capLamports","withinCap"],"properties":{"metadataUploadLamports":{"$ref":"#/$defs/unsignedDecimal"},"creationDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"recoveryDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"graduationDebitLamports":{"const":"0"},"cumulativeCreatorDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"capLamports":{"const":"1000000000"},"withinCap":{"const":true}}};

function validate45(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate45.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.metadataUploadLamports === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "metadataUploadLamports"},message:"must have required property '"+"metadataUploadLamports"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.creationDebitLamports === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creationDebitLamports"},message:"must have required property '"+"creationDebitLamports"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.recoveryDebitLamports === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "recoveryDebitLamports"},message:"must have required property '"+"recoveryDebitLamports"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.graduationDebitLamports === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "graduationDebitLamports"},message:"must have required property '"+"graduationDebitLamports"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.cumulativeCreatorDebitLamports === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "cumulativeCreatorDebitLamports"},message:"must have required property '"+"cumulativeCreatorDebitLamports"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.capLamports === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "capLamports"},message:"must have required property '"+"capLamports"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.withinCap === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "withinCap"},message:"must have required property '"+"withinCap"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "metadataUploadLamports") || (key0 === "creationDebitLamports")) || (key0 === "recoveryDebitLamports")) || (key0 === "graduationDebitLamports")) || (key0 === "cumulativeCreatorDebitLamports")) || (key0 === "capLamports")) || (key0 === "withinCap"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.metadataUploadLamports !== undefined){
let data0 = data.metadataUploadLamports;
if(typeof data0 === "string"){
if(!pattern14.test(data0)){
const err8 = {instancePath:instancePath+"/metadataUploadLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/metadataUploadLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.creationDebitLamports !== undefined){
let data1 = data.creationDebitLamports;
if(typeof data1 === "string"){
if(!pattern14.test(data1)){
const err10 = {instancePath:instancePath+"/creationDebitLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/creationDebitLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.recoveryDebitLamports !== undefined){
let data2 = data.recoveryDebitLamports;
if(typeof data2 === "string"){
if(!pattern14.test(data2)){
const err12 = {instancePath:instancePath+"/recoveryDebitLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/recoveryDebitLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.graduationDebitLamports !== undefined){
if("0" !== data.graduationDebitLamports){
const err14 = {instancePath:instancePath+"/graduationDebitLamports",schemaPath:"#/properties/graduationDebitLamports/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.cumulativeCreatorDebitLamports !== undefined){
let data4 = data.cumulativeCreatorDebitLamports;
if(typeof data4 === "string"){
if(!pattern14.test(data4)){
const err15 = {instancePath:instancePath+"/cumulativeCreatorDebitLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
else {
const err16 = {instancePath:instancePath+"/cumulativeCreatorDebitLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.capLamports !== undefined){
if("1000000000" !== data.capLamports){
const err17 = {instancePath:instancePath+"/capLamports",schemaPath:"#/properties/capLamports/const",keyword:"const",params:{allowedValue: "1000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.withinCap !== undefined){
if(true !== data.withinCap){
const err18 = {instancePath:instancePath+"/withinCap",schemaPath:"#/properties/withinCap/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
}
else {
const err19 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
validate45.errors = vErrors;
return errors === 0;
}
validate45.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema84 = {"type":"object","additionalProperties":false,"required":["name","symbol","uri","metadataAccount","metadataAccountSha256","jsonSha256","imageUri","imageSha256","externalUrl","twitter","updateAuthority","isMutable"],"properties":{"name":{"const":"Hakky Protocol"},"symbol":{"const":"HAKKY"},"uri":{"$ref":"#/$defs/contentUri"},"metadataAccount":{"$ref":"#/$defs/publicKey"},"metadataAccountSha256":{"$ref":"#/$defs/sha256"},"jsonSha256":{"$ref":"#/$defs/sha256"},"imageUri":{"$ref":"#/$defs/contentUri"},"imageSha256":{"$ref":"#/$defs/sha256"},"externalUrl":{"const":"https://hakky.xyz"},"twitter":{"const":"https://x.com/antihakkysack"},"updateAuthority":{"$ref":"#/$defs/publicKey"},"isMutable":{"const":false}}};
const schema85 = {"type":"string","pattern":"^ipfs://b[a-z2-7]{10,}$"};
const pattern26 = new RegExp("^ipfs://b[a-z2-7]{10,}$", "u");

function validate47(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate47.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.name === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.symbol === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "symbol"},message:"must have required property '"+"symbol"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.uri === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "uri"},message:"must have required property '"+"uri"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.metadataAccount === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "metadataAccount"},message:"must have required property '"+"metadataAccount"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.metadataAccountSha256 === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "metadataAccountSha256"},message:"must have required property '"+"metadataAccountSha256"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.jsonSha256 === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "jsonSha256"},message:"must have required property '"+"jsonSha256"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.imageUri === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "imageUri"},message:"must have required property '"+"imageUri"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.imageSha256 === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "imageSha256"},message:"must have required property '"+"imageSha256"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.externalUrl === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "externalUrl"},message:"must have required property '"+"externalUrl"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.twitter === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "twitter"},message:"must have required property '"+"twitter"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.updateAuthority === undefined){
const err10 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "updateAuthority"},message:"must have required property '"+"updateAuthority"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data.isMutable === undefined){
const err11 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "isMutable"},message:"must have required property '"+"isMutable"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema84.properties, key0))){
const err12 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.name !== undefined){
if("Hakky Protocol" !== data.name){
const err13 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/const",keyword:"const",params:{allowedValue: "Hakky Protocol"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.symbol !== undefined){
if("HAKKY" !== data.symbol){
const err14 = {instancePath:instancePath+"/symbol",schemaPath:"#/properties/symbol/const",keyword:"const",params:{allowedValue: "HAKKY"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.uri !== undefined){
let data2 = data.uri;
if(typeof data2 === "string"){
if(!pattern26.test(data2)){
const err15 = {instancePath:instancePath+"/uri",schemaPath:"#/$defs/contentUri/pattern",keyword:"pattern",params:{pattern: "^ipfs://b[a-z2-7]{10,}$"},message:"must match pattern \""+"^ipfs://b[a-z2-7]{10,}$"+"\""};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
else {
const err16 = {instancePath:instancePath+"/uri",schemaPath:"#/$defs/contentUri/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.metadataAccount !== undefined){
let data3 = data.metadataAccount;
if(typeof data3 === "string"){
if(!pattern4.test(data3)){
const err17 = {instancePath:instancePath+"/metadataAccount",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
else {
const err18 = {instancePath:instancePath+"/metadataAccount",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.metadataAccountSha256 !== undefined){
let data4 = data.metadataAccountSha256;
if(typeof data4 === "string"){
if(!pattern5.test(data4)){
const err19 = {instancePath:instancePath+"/metadataAccountSha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
else {
const err20 = {instancePath:instancePath+"/metadataAccountSha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.jsonSha256 !== undefined){
let data5 = data.jsonSha256;
if(typeof data5 === "string"){
if(!pattern5.test(data5)){
const err21 = {instancePath:instancePath+"/jsonSha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
else {
const err22 = {instancePath:instancePath+"/jsonSha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.imageUri !== undefined){
let data6 = data.imageUri;
if(typeof data6 === "string"){
if(!pattern26.test(data6)){
const err23 = {instancePath:instancePath+"/imageUri",schemaPath:"#/$defs/contentUri/pattern",keyword:"pattern",params:{pattern: "^ipfs://b[a-z2-7]{10,}$"},message:"must match pattern \""+"^ipfs://b[a-z2-7]{10,}$"+"\""};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
else {
const err24 = {instancePath:instancePath+"/imageUri",schemaPath:"#/$defs/contentUri/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data.imageSha256 !== undefined){
let data7 = data.imageSha256;
if(typeof data7 === "string"){
if(!pattern5.test(data7)){
const err25 = {instancePath:instancePath+"/imageSha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
else {
const err26 = {instancePath:instancePath+"/imageSha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.externalUrl !== undefined){
if("https://hakky.xyz" !== data.externalUrl){
const err27 = {instancePath:instancePath+"/externalUrl",schemaPath:"#/properties/externalUrl/const",keyword:"const",params:{allowedValue: "https://hakky.xyz"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data.twitter !== undefined){
if("https://x.com/antihakkysack" !== data.twitter){
const err28 = {instancePath:instancePath+"/twitter",schemaPath:"#/properties/twitter/const",keyword:"const",params:{allowedValue: "https://x.com/antihakkysack"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data.updateAuthority !== undefined){
let data10 = data.updateAuthority;
if(typeof data10 === "string"){
if(!pattern4.test(data10)){
const err29 = {instancePath:instancePath+"/updateAuthority",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
else {
const err30 = {instancePath:instancePath+"/updateAuthority",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.isMutable !== undefined){
if(false !== data.isMutable){
const err31 = {instancePath:instancePath+"/isMutable",schemaPath:"#/properties/isMutable/const",keyword:"const",params:{allowedValue: false},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
}
else {
const err32 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
validate47.errors = vErrors;
return errors === 0;
}
validate47.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema92 = {"type":"object","additionalProperties":false,"required":["creation"],"properties":{"creation":{"$ref":"#/$defs/transaction"}}};
const schema93 = {"type":"object","additionalProperties":false,"required":["signature","finalizedSlot","finalizedAt"],"properties":{"signature":{"$ref":"#/$defs/signature"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}};
const schema94 = {"type":"string","pattern":"^[1-9A-HJ-NP-Za-km-z]{64,88}$"};
const pattern33 = new RegExp("^[1-9A-HJ-NP-Za-km-z]{64,88}$", "u");

function validate50(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate50.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.signature === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "signature"},message:"must have required property '"+"signature"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.finalizedSlot === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.finalizedAt === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "signature") || (key0 === "finalizedSlot")) || (key0 === "finalizedAt"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.signature !== undefined){
let data0 = data.signature;
if(typeof data0 === "string"){
if(!pattern33.test(data0)){
const err4 = {instancePath:instancePath+"/signature",schemaPath:"#/$defs/signature/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{64,88}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{64,88}$"+"\""};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
else {
const err5 = {instancePath:instancePath+"/signature",schemaPath:"#/$defs/signature/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.finalizedSlot !== undefined){
let data1 = data.finalizedSlot;
if(!(((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1))) && (isFinite(data1)))){
const err6 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if((typeof data1 == "number") && (isFinite(data1))){
if(data1 > 9007199254740991 || isNaN(data1)){
const err7 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data1 < 0 || isNaN(data1)){
const err8 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
}
if(data.finalizedAt !== undefined){
let data2 = data.finalizedAt;
if(typeof data2 === "string"){
if(!pattern7.test(data2)){
const err9 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"+"\""};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
}
else {
const err11 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
validate50.errors = vErrors;
return errors === 0;
}
validate50.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate49(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate49.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.creation === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creation"},message:"must have required property '"+"creation"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "creation")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.creation !== undefined){
if(!(validate50(data.creation, {instancePath:instancePath+"/creation",parentData:data,parentDataProperty:"creation",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate50.errors : vErrors.concat(validate50.errors);
errors = vErrors.length;
}
}
}
else {
const err2 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
validate49.errors = vErrors;
return errors === 0;
}
validate49.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const pattern35 = new RegExp("^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$", "u");
const pattern36 = new RegExp("^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$", "u");
const pattern37 = new RegExp("^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$", "u");

function validate28(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate28.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stage === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "stage"},message:"must have required property '"+"stage"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.availability === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "availability"},message:"must have required property '"+"availability"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.sourceArtifacts === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "sourceArtifacts"},message:"must have required property '"+"sourceArtifacts"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.observation === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "observation"},message:"must have required property '"+"observation"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.supply === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "supply"},message:"must have required property '"+"supply"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.authorities === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "authorities"},message:"must have required property '"+"authorities"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.creatorBalance === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creatorBalance"},message:"must have required property '"+"creatorBalance"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.allocations === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "allocations"},message:"must have required property '"+"allocations"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.quote === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "quote"},message:"must have required property '"+"quote"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.creatorFirstBuy === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creatorFirstBuy"},message:"must have required property '"+"creatorFirstBuy"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.vesting === undefined){
const err10 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "vesting"},message:"must have required property '"+"vesting"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data.fees === undefined){
const err11 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "fees"},message:"must have required property '"+"fees"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.cost === undefined){
const err12 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "cost"},message:"must have required property '"+"cost"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.metadata === undefined){
const err13 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "metadata"},message:"must have required property '"+"metadata"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data.transactions === undefined){
const err14 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "transactions"},message:"must have required property '"+"transactions"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data.links === undefined){
const err15 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "links"},message:"must have required property '"+"links"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema46.properties, key0))){
const err16 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.stage !== undefined){
if("curve-live" !== data.stage){
const err17 = {instancePath:instancePath+"/stage",schemaPath:"#/properties/stage/const",keyword:"const",params:{allowedValue: "curve-live"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.availability !== undefined){
if("verified" !== data.availability){
const err18 = {instancePath:instancePath+"/availability",schemaPath:"#/properties/availability/const",keyword:"const",params:{allowedValue: "verified"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.sourceArtifacts !== undefined){
if(!(validate29(data.sourceArtifacts, {instancePath:instancePath+"/sourceArtifacts",parentData:data,parentDataProperty:"sourceArtifacts",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate29.errors : vErrors.concat(validate29.errors);
errors = vErrors.length;
}
}
if(data.observation !== undefined){
if(!(validate35(data.observation, {instancePath:instancePath+"/observation",parentData:data,parentDataProperty:"observation",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate35.errors : vErrors.concat(validate35.errors);
errors = vErrors.length;
}
}
if(data.supply !== undefined){
let data4 = data.supply;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.baseUnits === undefined){
const err19 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/required",keyword:"required",params:{missingProperty: "baseUnits"},message:"must have required property '"+"baseUnits"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data4.uiAmount === undefined){
const err20 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/required",keyword:"required",params:{missingProperty: "uiAmount"},message:"must have required property '"+"uiAmount"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data4.decimals === undefined){
const err21 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/required",keyword:"required",params:{missingProperty: "decimals"},message:"must have required property '"+"decimals"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data4.tokenProgram === undefined){
const err22 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/required",keyword:"required",params:{missingProperty: "tokenProgram"},message:"must have required property '"+"tokenProgram"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
for(const key1 in data4){
if(!((((key1 === "baseUnits") || (key1 === "uiAmount")) || (key1 === "decimals")) || (key1 === "tokenProgram"))){
const err23 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data4.baseUnits !== undefined){
if("1000000000000" !== data4.baseUnits){
const err24 = {instancePath:instancePath+"/supply/baseUnits",schemaPath:"#/$defs/supply/properties/baseUnits/const",keyword:"const",params:{allowedValue: "1000000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data4.uiAmount !== undefined){
if("1000000" !== data4.uiAmount){
const err25 = {instancePath:instancePath+"/supply/uiAmount",schemaPath:"#/$defs/supply/properties/uiAmount/const",keyword:"const",params:{allowedValue: "1000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data4.decimals !== undefined){
if(6 !== data4.decimals){
const err26 = {instancePath:instancePath+"/supply/decimals",schemaPath:"#/$defs/supply/properties/decimals/const",keyword:"const",params:{allowedValue: 6},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data4.tokenProgram !== undefined){
if("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" !== data4.tokenProgram){
const err27 = {instancePath:instancePath+"/supply/tokenProgram",schemaPath:"#/$defs/supply/properties/tokenProgram/const",keyword:"const",params:{allowedValue: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
else {
const err28 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data.authorities !== undefined){
let data9 = data.authorities;
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.mintAuthority === undefined){
const err29 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/curveAuthorities/required",keyword:"required",params:{missingProperty: "mintAuthority"},message:"must have required property '"+"mintAuthority"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data9.authorityKind === undefined){
const err30 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/curveAuthorities/required",keyword:"required",params:{missingProperty: "authorityKind"},message:"must have required property '"+"authorityKind"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data9.freezeAuthority === undefined){
const err31 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/curveAuthorities/required",keyword:"required",params:{missingProperty: "freezeAuthority"},message:"must have required property '"+"freezeAuthority"+"'"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
for(const key2 in data9){
if(!(((key2 === "mintAuthority") || (key2 === "authorityKind")) || (key2 === "freezeAuthority"))){
const err32 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/curveAuthorities/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data9.mintAuthority !== undefined){
if("WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh" !== data9.mintAuthority){
const err33 = {instancePath:instancePath+"/authorities/mintAuthority",schemaPath:"#/$defs/curveAuthorities/properties/mintAuthority/const",keyword:"const",params:{allowedValue: "WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
if(data9.authorityKind !== undefined){
if("launchlab-program-pda" !== data9.authorityKind){
const err34 = {instancePath:instancePath+"/authorities/authorityKind",schemaPath:"#/$defs/curveAuthorities/properties/authorityKind/const",keyword:"const",params:{allowedValue: "launchlab-program-pda"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data9.freezeAuthority !== undefined){
if(data9.freezeAuthority !== null){
const err35 = {instancePath:instancePath+"/authorities/freezeAuthority",schemaPath:"#/$defs/curveAuthorities/properties/freezeAuthority/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
}
else {
const err36 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/curveAuthorities/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data.creatorBalance !== undefined){
if(!(validate37(data.creatorBalance, {instancePath:instancePath+"/creatorBalance",parentData:data,parentDataProperty:"creatorBalance",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate37.errors : vErrors.concat(validate37.errors);
errors = vErrors.length;
}
}
if(data.allocations !== undefined){
let data14 = data.allocations;
if(data14 && typeof data14 == "object" && !Array.isArray(data14)){
if(data14.publicCurveBaseUnits === undefined){
const err37 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "publicCurveBaseUnits"},message:"must have required property '"+"publicCurveBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data14.publicCurveBps === undefined){
const err38 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "publicCurveBps"},message:"must have required property '"+"publicCurveBps"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data14.liquidityBaseUnits === undefined){
const err39 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "liquidityBaseUnits"},message:"must have required property '"+"liquidityBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data14.liquidityBps === undefined){
const err40 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "liquidityBps"},message:"must have required property '"+"liquidityBps"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data14.teamBaseUnits === undefined){
const err41 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "teamBaseUnits"},message:"must have required property '"+"teamBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data14.teamBps === undefined){
const err42 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "teamBps"},message:"must have required property '"+"teamBps"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data14.totalBps === undefined){
const err43 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "totalBps"},message:"must have required property '"+"totalBps"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
for(const key3 in data14){
if(!(((((((key3 === "publicCurveBaseUnits") || (key3 === "publicCurveBps")) || (key3 === "liquidityBaseUnits")) || (key3 === "liquidityBps")) || (key3 === "teamBaseUnits")) || (key3 === "teamBps")) || (key3 === "totalBps"))){
const err44 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data14.publicCurveBaseUnits !== undefined){
if("800000000000" !== data14.publicCurveBaseUnits){
const err45 = {instancePath:instancePath+"/allocations/publicCurveBaseUnits",schemaPath:"#/$defs/allocations/properties/publicCurveBaseUnits/const",keyword:"const",params:{allowedValue: "800000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data14.publicCurveBps !== undefined){
if(8000 !== data14.publicCurveBps){
const err46 = {instancePath:instancePath+"/allocations/publicCurveBps",schemaPath:"#/$defs/allocations/properties/publicCurveBps/const",keyword:"const",params:{allowedValue: 8000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data14.liquidityBaseUnits !== undefined){
if("200000000000" !== data14.liquidityBaseUnits){
const err47 = {instancePath:instancePath+"/allocations/liquidityBaseUnits",schemaPath:"#/$defs/allocations/properties/liquidityBaseUnits/const",keyword:"const",params:{allowedValue: "200000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data14.liquidityBps !== undefined){
if(2000 !== data14.liquidityBps){
const err48 = {instancePath:instancePath+"/allocations/liquidityBps",schemaPath:"#/$defs/allocations/properties/liquidityBps/const",keyword:"const",params:{allowedValue: 2000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data14.teamBaseUnits !== undefined){
if("0" !== data14.teamBaseUnits){
const err49 = {instancePath:instancePath+"/allocations/teamBaseUnits",schemaPath:"#/$defs/allocations/properties/teamBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data14.teamBps !== undefined){
if(0 !== data14.teamBps){
const err50 = {instancePath:instancePath+"/allocations/teamBps",schemaPath:"#/$defs/allocations/properties/teamBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data14.totalBps !== undefined){
if(10000 !== data14.totalBps){
const err51 = {instancePath:instancePath+"/allocations/totalBps",schemaPath:"#/$defs/allocations/properties/totalBps/const",keyword:"const",params:{allowedValue: 10000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
else {
const err52 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data.quote !== undefined){
if(!(validate41(data.quote, {instancePath:instancePath+"/quote",parentData:data,parentDataProperty:"quote",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
errors = vErrors.length;
}
}
if(data.creatorFirstBuy !== undefined){
let data23 = data.creatorFirstBuy;
if(data23 && typeof data23 == "object" && !Array.isArray(data23)){
if(data23.creatorLamports === undefined){
const err53 = {instancePath:instancePath+"/creatorFirstBuy",schemaPath:"#/$defs/creatorFirstBuy/required",keyword:"required",params:{missingProperty: "creatorLamports"},message:"must have required property '"+"creatorLamports"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data23.creatorTokenBaseUnits === undefined){
const err54 = {instancePath:instancePath+"/creatorFirstBuy",schemaPath:"#/$defs/creatorFirstBuy/required",keyword:"required",params:{missingProperty: "creatorTokenBaseUnits"},message:"must have required property '"+"creatorTokenBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
for(const key4 in data23){
if(!((key4 === "creatorLamports") || (key4 === "creatorTokenBaseUnits"))){
const err55 = {instancePath:instancePath+"/creatorFirstBuy",schemaPath:"#/$defs/creatorFirstBuy/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data23.creatorLamports !== undefined){
if("0" !== data23.creatorLamports){
const err56 = {instancePath:instancePath+"/creatorFirstBuy/creatorLamports",schemaPath:"#/$defs/creatorFirstBuy/properties/creatorLamports/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
if(data23.creatorTokenBaseUnits !== undefined){
if("0" !== data23.creatorTokenBaseUnits){
const err57 = {instancePath:instancePath+"/creatorFirstBuy/creatorTokenBaseUnits",schemaPath:"#/$defs/creatorFirstBuy/properties/creatorTokenBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
}
else {
const err58 = {instancePath:instancePath+"/creatorFirstBuy",schemaPath:"#/$defs/creatorFirstBuy/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data.vesting !== undefined){
let data26 = data.vesting;
if(data26 && typeof data26 == "object" && !Array.isArray(data26)){
if(data26.lockedBaseUnits === undefined){
const err59 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/required",keyword:"required",params:{missingProperty: "lockedBaseUnits"},message:"must have required property '"+"lockedBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
if(data26.cliffSeconds === undefined){
const err60 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/required",keyword:"required",params:{missingProperty: "cliffSeconds"},message:"must have required property '"+"cliffSeconds"+"'"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
if(data26.unlockSeconds === undefined){
const err61 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/required",keyword:"required",params:{missingProperty: "unlockSeconds"},message:"must have required property '"+"unlockSeconds"+"'"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
for(const key5 in data26){
if(!(((key5 === "lockedBaseUnits") || (key5 === "cliffSeconds")) || (key5 === "unlockSeconds"))){
const err62 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
if(data26.lockedBaseUnits !== undefined){
if("0" !== data26.lockedBaseUnits){
const err63 = {instancePath:instancePath+"/vesting/lockedBaseUnits",schemaPath:"#/$defs/vesting/properties/lockedBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
}
if(data26.cliffSeconds !== undefined){
if("0" !== data26.cliffSeconds){
const err64 = {instancePath:instancePath+"/vesting/cliffSeconds",schemaPath:"#/$defs/vesting/properties/cliffSeconds/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
}
if(data26.unlockSeconds !== undefined){
if("0" !== data26.unlockSeconds){
const err65 = {instancePath:instancePath+"/vesting/unlockSeconds",schemaPath:"#/$defs/vesting/properties/unlockSeconds/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
}
else {
const err66 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
if(data.fees !== undefined){
if(!(validate43(data.fees, {instancePath:instancePath+"/fees",parentData:data,parentDataProperty:"fees",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate43.errors : vErrors.concat(validate43.errors);
errors = vErrors.length;
}
}
if(data.cost !== undefined){
if(!(validate45(data.cost, {instancePath:instancePath+"/cost",parentData:data,parentDataProperty:"cost",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate45.errors : vErrors.concat(validate45.errors);
errors = vErrors.length;
}
}
if(data.metadata !== undefined){
if(!(validate47(data.metadata, {instancePath:instancePath+"/metadata",parentData:data,parentDataProperty:"metadata",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate47.errors : vErrors.concat(validate47.errors);
errors = vErrors.length;
}
}
if(data.transactions !== undefined){
if(!(validate49(data.transactions, {instancePath:instancePath+"/transactions",parentData:data,parentDataProperty:"transactions",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate49.errors : vErrors.concat(validate49.errors);
errors = vErrors.length;
}
}
if(data.links !== undefined){
let data34 = data.links;
if(data34 && typeof data34 == "object" && !Array.isArray(data34)){
if(data34.solscanMint === undefined){
const err67 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/curveLinks/required",keyword:"required",params:{missingProperty: "solscanMint"},message:"must have required property '"+"solscanMint"+"'"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
if(data34.solscanCreationTransaction === undefined){
const err68 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/curveLinks/required",keyword:"required",params:{missingProperty: "solscanCreationTransaction"},message:"must have required property '"+"solscanCreationTransaction"+"'"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
if(data34.raydiumLaunchlab === undefined){
const err69 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/curveLinks/required",keyword:"required",params:{missingProperty: "raydiumLaunchlab"},message:"must have required property '"+"raydiumLaunchlab"+"'"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
for(const key6 in data34){
if(!(((key6 === "solscanMint") || (key6 === "solscanCreationTransaction")) || (key6 === "raydiumLaunchlab"))){
const err70 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/curveLinks/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
}
if(data34.solscanMint !== undefined){
let data35 = data34.solscanMint;
if(typeof data35 === "string"){
if(!pattern35.test(data35)){
const err71 = {instancePath:instancePath+"/links/solscanMint",schemaPath:"#/$defs/curveLinks/properties/solscanMint/pattern",keyword:"pattern",params:{pattern: "^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
}
else {
const err72 = {instancePath:instancePath+"/links/solscanMint",schemaPath:"#/$defs/curveLinks/properties/solscanMint/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
}
if(data34.solscanCreationTransaction !== undefined){
let data36 = data34.solscanCreationTransaction;
if(typeof data36 === "string"){
if(!pattern36.test(data36)){
const err73 = {instancePath:instancePath+"/links/solscanCreationTransaction",schemaPath:"#/$defs/curveLinks/properties/solscanCreationTransaction/pattern",keyword:"pattern",params:{pattern: "^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},message:"must match pattern \""+"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"+"\""};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
}
else {
const err74 = {instancePath:instancePath+"/links/solscanCreationTransaction",schemaPath:"#/$defs/curveLinks/properties/solscanCreationTransaction/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
}
if(data34.raydiumLaunchlab !== undefined){
let data37 = data34.raydiumLaunchlab;
if(typeof data37 === "string"){
if(!pattern37.test(data37)){
const err75 = {instancePath:instancePath+"/links/raydiumLaunchlab",schemaPath:"#/$defs/curveLinks/properties/raydiumLaunchlab/pattern",keyword:"pattern",params:{pattern: "^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
else {
const err76 = {instancePath:instancePath+"/links/raydiumLaunchlab",schemaPath:"#/$defs/curveLinks/properties/raydiumLaunchlab/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
}
else {
const err77 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/curveLinks/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
}
else {
const err78 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
validate28.errors = vErrors;
return errors === 0;
}
validate28.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate25(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate25.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.status === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.network === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "network"},message:"must have required property '"+"network"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.project === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "project"},message:"must have required property '"+"project"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.token === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "token"},message:"must have required property '"+"token"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.launch === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "launch"},message:"must have required property '"+"launch"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.proof === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proof"},message:"must have required property '"+"proof"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "schemaVersion") || (key0 === "status")) || (key0 === "network")) || (key0 === "project")) || (key0 === "token")) || (key0 === "launch")) || (key0 === "proof"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(2 !== data.schemaVersion){
const err8 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.status !== undefined){
if("curve-live" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "curve-live"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.network !== undefined){
if("mainnet-beta" !== data.network){
const err10 = {instancePath:instancePath+"/network",schemaPath:"#/properties/network/const",keyword:"const",params:{allowedValue: "mainnet-beta"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.project !== undefined){
let data3 = data.project;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.name === undefined){
const err11 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3.symbol === undefined){
const err12 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "symbol"},message:"must have required property '"+"symbol"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data3.agent === undefined){
const err13 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "agent"},message:"must have required property '"+"agent"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data3.website === undefined){
const err14 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "website"},message:"must have required property '"+"website"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data3.x === undefined){
const err15 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "x"},message:"must have required property '"+"x"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key1 in data3){
if(!(((((key1 === "name") || (key1 === "symbol")) || (key1 === "agent")) || (key1 === "website")) || (key1 === "x"))){
const err16 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data3.name !== undefined){
if("Hakky Protocol" !== data3.name){
const err17 = {instancePath:instancePath+"/project/name",schemaPath:"#/$defs/project/properties/name/const",keyword:"const",params:{allowedValue: "Hakky Protocol"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data3.symbol !== undefined){
if("HAKKY" !== data3.symbol){
const err18 = {instancePath:instancePath+"/project/symbol",schemaPath:"#/$defs/project/properties/symbol/const",keyword:"const",params:{allowedValue: "HAKKY"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data3.agent !== undefined){
if("HakkyAgent" !== data3.agent){
const err19 = {instancePath:instancePath+"/project/agent",schemaPath:"#/$defs/project/properties/agent/const",keyword:"const",params:{allowedValue: "HakkyAgent"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data3.website !== undefined){
if("https://hakky.xyz" !== data3.website){
const err20 = {instancePath:instancePath+"/project/website",schemaPath:"#/$defs/project/properties/website/const",keyword:"const",params:{allowedValue: "https://hakky.xyz"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data3.x !== undefined){
if("https://x.com/antihakkysack" !== data3.x){
const err21 = {instancePath:instancePath+"/project/x",schemaPath:"#/$defs/project/properties/x/const",keyword:"const",params:{allowedValue: "https://x.com/antihakkysack"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
else {
const err22 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.token !== undefined){
if(!(validate26(data.token, {instancePath:instancePath+"/token",parentData:data,parentDataProperty:"token",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
errors = vErrors.length;
}
}
if(data.launch !== undefined){
let data10 = data.launch;
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
if(data10.venue === undefined){
const err23 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "venue"},message:"must have required property '"+"venue"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data10.quoteSymbol === undefined){
const err24 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "quoteSymbol"},message:"must have required property '"+"quoteSymbol"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data10.publicCurveBps === undefined){
const err25 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "publicCurveBps"},message:"must have required property '"+"publicCurveBps"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data10.liquidityBps === undefined){
const err26 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "liquidityBps"},message:"must have required property '"+"liquidityBps"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data10.teamBps === undefined){
const err27 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "teamBps"},message:"must have required property '"+"teamBps"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data10.creatorFirstBuyLamports === undefined){
const err28 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorFirstBuyLamports"},message:"must have required property '"+"creatorFirstBuyLamports"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data10.vestingBaseUnits === undefined){
const err29 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "vestingBaseUnits"},message:"must have required property '"+"vestingBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data10.creatorDebitCapLamports === undefined){
const err30 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorDebitCapLamports"},message:"must have required property '"+"creatorDebitCapLamports"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
for(const key2 in data10){
if(!((((((((key2 === "venue") || (key2 === "quoteSymbol")) || (key2 === "publicCurveBps")) || (key2 === "liquidityBps")) || (key2 === "teamBps")) || (key2 === "creatorFirstBuyLamports")) || (key2 === "vestingBaseUnits")) || (key2 === "creatorDebitCapLamports"))){
const err31 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data10.venue !== undefined){
if("Raydium LaunchLab" !== data10.venue){
const err32 = {instancePath:instancePath+"/launch/venue",schemaPath:"#/$defs/launch/properties/venue/const",keyword:"const",params:{allowedValue: "Raydium LaunchLab"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data10.quoteSymbol !== undefined){
if("SOL" !== data10.quoteSymbol){
const err33 = {instancePath:instancePath+"/launch/quoteSymbol",schemaPath:"#/$defs/launch/properties/quoteSymbol/const",keyword:"const",params:{allowedValue: "SOL"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
if(data10.publicCurveBps !== undefined){
if(8000 !== data10.publicCurveBps){
const err34 = {instancePath:instancePath+"/launch/publicCurveBps",schemaPath:"#/$defs/launch/properties/publicCurveBps/const",keyword:"const",params:{allowedValue: 8000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data10.liquidityBps !== undefined){
if(2000 !== data10.liquidityBps){
const err35 = {instancePath:instancePath+"/launch/liquidityBps",schemaPath:"#/$defs/launch/properties/liquidityBps/const",keyword:"const",params:{allowedValue: 2000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data10.teamBps !== undefined){
if(0 !== data10.teamBps){
const err36 = {instancePath:instancePath+"/launch/teamBps",schemaPath:"#/$defs/launch/properties/teamBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data10.creatorFirstBuyLamports !== undefined){
if("0" !== data10.creatorFirstBuyLamports){
const err37 = {instancePath:instancePath+"/launch/creatorFirstBuyLamports",schemaPath:"#/$defs/launch/properties/creatorFirstBuyLamports/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data10.vestingBaseUnits !== undefined){
if("0" !== data10.vestingBaseUnits){
const err38 = {instancePath:instancePath+"/launch/vestingBaseUnits",schemaPath:"#/$defs/launch/properties/vestingBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data10.creatorDebitCapLamports !== undefined){
if("1000000000" !== data10.creatorDebitCapLamports){
const err39 = {instancePath:instancePath+"/launch/creatorDebitCapLamports",schemaPath:"#/$defs/launch/properties/creatorDebitCapLamports/const",keyword:"const",params:{allowedValue: "1000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
else {
const err40 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data.proof !== undefined){
if(!(validate28(data.proof, {instancePath:instancePath+"/proof",parentData:data,parentDataProperty:"proof",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
}
else {
const err41 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
validate25.errors = vErrors;
return errors === 0;
}
validate25.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema98 = {"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"graduated"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/unavailableToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"$ref":"#/$defs/graduatedUnavailableProof"}}};
const schema102 = {"type":"object","additionalProperties":false,"required":["stage","availability"],"properties":{"stage":{"const":"graduated"},"availability":{"const":"unavailable"}}};

function validate55(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate55.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.status === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.network === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "network"},message:"must have required property '"+"network"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.project === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "project"},message:"must have required property '"+"project"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.token === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "token"},message:"must have required property '"+"token"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.launch === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "launch"},message:"must have required property '"+"launch"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.proof === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proof"},message:"must have required property '"+"proof"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "schemaVersion") || (key0 === "status")) || (key0 === "network")) || (key0 === "project")) || (key0 === "token")) || (key0 === "launch")) || (key0 === "proof"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(2 !== data.schemaVersion){
const err8 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.status !== undefined){
if("graduated" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "graduated"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.network !== undefined){
if("mainnet-beta" !== data.network){
const err10 = {instancePath:instancePath+"/network",schemaPath:"#/properties/network/const",keyword:"const",params:{allowedValue: "mainnet-beta"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.project !== undefined){
let data3 = data.project;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.name === undefined){
const err11 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3.symbol === undefined){
const err12 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "symbol"},message:"must have required property '"+"symbol"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data3.agent === undefined){
const err13 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "agent"},message:"must have required property '"+"agent"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data3.website === undefined){
const err14 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "website"},message:"must have required property '"+"website"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data3.x === undefined){
const err15 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "x"},message:"must have required property '"+"x"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key1 in data3){
if(!(((((key1 === "name") || (key1 === "symbol")) || (key1 === "agent")) || (key1 === "website")) || (key1 === "x"))){
const err16 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data3.name !== undefined){
if("Hakky Protocol" !== data3.name){
const err17 = {instancePath:instancePath+"/project/name",schemaPath:"#/$defs/project/properties/name/const",keyword:"const",params:{allowedValue: "Hakky Protocol"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data3.symbol !== undefined){
if("HAKKY" !== data3.symbol){
const err18 = {instancePath:instancePath+"/project/symbol",schemaPath:"#/$defs/project/properties/symbol/const",keyword:"const",params:{allowedValue: "HAKKY"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data3.agent !== undefined){
if("HakkyAgent" !== data3.agent){
const err19 = {instancePath:instancePath+"/project/agent",schemaPath:"#/$defs/project/properties/agent/const",keyword:"const",params:{allowedValue: "HakkyAgent"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data3.website !== undefined){
if("https://hakky.xyz" !== data3.website){
const err20 = {instancePath:instancePath+"/project/website",schemaPath:"#/$defs/project/properties/website/const",keyword:"const",params:{allowedValue: "https://hakky.xyz"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data3.x !== undefined){
if("https://x.com/antihakkysack" !== data3.x){
const err21 = {instancePath:instancePath+"/project/x",schemaPath:"#/$defs/project/properties/x/const",keyword:"const",params:{allowedValue: "https://x.com/antihakkysack"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
else {
const err22 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.token !== undefined){
let data9 = data.token;
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.mint === undefined){
const err23 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "mint"},message:"must have required property '"+"mint"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data9.supplyBaseUnits === undefined){
const err24 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "supplyBaseUnits"},message:"must have required property '"+"supplyBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data9.uiSupply === undefined){
const err25 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "uiSupply"},message:"must have required property '"+"uiSupply"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data9.decimals === undefined){
const err26 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "decimals"},message:"must have required property '"+"decimals"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data9.tokenProgram === undefined){
const err27 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/required",keyword:"required",params:{missingProperty: "tokenProgram"},message:"must have required property '"+"tokenProgram"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
for(const key2 in data9){
if(!(((((key2 === "mint") || (key2 === "supplyBaseUnits")) || (key2 === "uiSupply")) || (key2 === "decimals")) || (key2 === "tokenProgram"))){
const err28 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data9.mint !== undefined){
if(data9.mint !== null){
const err29 = {instancePath:instancePath+"/token/mint",schemaPath:"#/$defs/unavailableToken/properties/mint/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data9.supplyBaseUnits !== undefined){
if("1000000000000" !== data9.supplyBaseUnits){
const err30 = {instancePath:instancePath+"/token/supplyBaseUnits",schemaPath:"#/$defs/unavailableToken/properties/supplyBaseUnits/const",keyword:"const",params:{allowedValue: "1000000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data9.uiSupply !== undefined){
if("1000000" !== data9.uiSupply){
const err31 = {instancePath:instancePath+"/token/uiSupply",schemaPath:"#/$defs/unavailableToken/properties/uiSupply/const",keyword:"const",params:{allowedValue: "1000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data9.decimals !== undefined){
if(6 !== data9.decimals){
const err32 = {instancePath:instancePath+"/token/decimals",schemaPath:"#/$defs/unavailableToken/properties/decimals/const",keyword:"const",params:{allowedValue: 6},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data9.tokenProgram !== undefined){
if("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" !== data9.tokenProgram){
const err33 = {instancePath:instancePath+"/token/tokenProgram",schemaPath:"#/$defs/unavailableToken/properties/tokenProgram/const",keyword:"const",params:{allowedValue: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
else {
const err34 = {instancePath:instancePath+"/token",schemaPath:"#/$defs/unavailableToken/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.launch !== undefined){
let data15 = data.launch;
if(data15 && typeof data15 == "object" && !Array.isArray(data15)){
if(data15.venue === undefined){
const err35 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "venue"},message:"must have required property '"+"venue"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data15.quoteSymbol === undefined){
const err36 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "quoteSymbol"},message:"must have required property '"+"quoteSymbol"+"'"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
if(data15.publicCurveBps === undefined){
const err37 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "publicCurveBps"},message:"must have required property '"+"publicCurveBps"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data15.liquidityBps === undefined){
const err38 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "liquidityBps"},message:"must have required property '"+"liquidityBps"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data15.teamBps === undefined){
const err39 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "teamBps"},message:"must have required property '"+"teamBps"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data15.creatorFirstBuyLamports === undefined){
const err40 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorFirstBuyLamports"},message:"must have required property '"+"creatorFirstBuyLamports"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data15.vestingBaseUnits === undefined){
const err41 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "vestingBaseUnits"},message:"must have required property '"+"vestingBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data15.creatorDebitCapLamports === undefined){
const err42 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorDebitCapLamports"},message:"must have required property '"+"creatorDebitCapLamports"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
for(const key3 in data15){
if(!((((((((key3 === "venue") || (key3 === "quoteSymbol")) || (key3 === "publicCurveBps")) || (key3 === "liquidityBps")) || (key3 === "teamBps")) || (key3 === "creatorFirstBuyLamports")) || (key3 === "vestingBaseUnits")) || (key3 === "creatorDebitCapLamports"))){
const err43 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data15.venue !== undefined){
if("Raydium LaunchLab" !== data15.venue){
const err44 = {instancePath:instancePath+"/launch/venue",schemaPath:"#/$defs/launch/properties/venue/const",keyword:"const",params:{allowedValue: "Raydium LaunchLab"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data15.quoteSymbol !== undefined){
if("SOL" !== data15.quoteSymbol){
const err45 = {instancePath:instancePath+"/launch/quoteSymbol",schemaPath:"#/$defs/launch/properties/quoteSymbol/const",keyword:"const",params:{allowedValue: "SOL"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
if(data15.publicCurveBps !== undefined){
if(8000 !== data15.publicCurveBps){
const err46 = {instancePath:instancePath+"/launch/publicCurveBps",schemaPath:"#/$defs/launch/properties/publicCurveBps/const",keyword:"const",params:{allowedValue: 8000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data15.liquidityBps !== undefined){
if(2000 !== data15.liquidityBps){
const err47 = {instancePath:instancePath+"/launch/liquidityBps",schemaPath:"#/$defs/launch/properties/liquidityBps/const",keyword:"const",params:{allowedValue: 2000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data15.teamBps !== undefined){
if(0 !== data15.teamBps){
const err48 = {instancePath:instancePath+"/launch/teamBps",schemaPath:"#/$defs/launch/properties/teamBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data15.creatorFirstBuyLamports !== undefined){
if("0" !== data15.creatorFirstBuyLamports){
const err49 = {instancePath:instancePath+"/launch/creatorFirstBuyLamports",schemaPath:"#/$defs/launch/properties/creatorFirstBuyLamports/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data15.vestingBaseUnits !== undefined){
if("0" !== data15.vestingBaseUnits){
const err50 = {instancePath:instancePath+"/launch/vestingBaseUnits",schemaPath:"#/$defs/launch/properties/vestingBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data15.creatorDebitCapLamports !== undefined){
if("1000000000" !== data15.creatorDebitCapLamports){
const err51 = {instancePath:instancePath+"/launch/creatorDebitCapLamports",schemaPath:"#/$defs/launch/properties/creatorDebitCapLamports/const",keyword:"const",params:{allowedValue: "1000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
else {
const err52 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data.proof !== undefined){
let data24 = data.proof;
if(data24 && typeof data24 == "object" && !Array.isArray(data24)){
if(data24.stage === undefined){
const err53 = {instancePath:instancePath+"/proof",schemaPath:"#/$defs/graduatedUnavailableProof/required",keyword:"required",params:{missingProperty: "stage"},message:"must have required property '"+"stage"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data24.availability === undefined){
const err54 = {instancePath:instancePath+"/proof",schemaPath:"#/$defs/graduatedUnavailableProof/required",keyword:"required",params:{missingProperty: "availability"},message:"must have required property '"+"availability"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
for(const key4 in data24){
if(!((key4 === "stage") || (key4 === "availability"))){
const err55 = {instancePath:instancePath+"/proof",schemaPath:"#/$defs/graduatedUnavailableProof/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data24.stage !== undefined){
if("graduated" !== data24.stage){
const err56 = {instancePath:instancePath+"/proof/stage",schemaPath:"#/$defs/graduatedUnavailableProof/properties/stage/const",keyword:"const",params:{allowedValue: "graduated"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
if(data24.availability !== undefined){
if("unavailable" !== data24.availability){
const err57 = {instancePath:instancePath+"/proof/availability",schemaPath:"#/$defs/graduatedUnavailableProof/properties/availability/const",keyword:"const",params:{allowedValue: "unavailable"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
}
else {
const err58 = {instancePath:instancePath+"/proof",schemaPath:"#/$defs/graduatedUnavailableProof/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
}
else {
const err59 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
validate55.errors = vErrors;
return errors === 0;
}
validate55.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema103 = {"type":"object","additionalProperties":false,"required":["schemaVersion","status","network","project","token","launch","proof"],"properties":{"schemaVersion":{"const":2},"status":{"const":"graduated"},"network":{"const":"mainnet-beta"},"project":{"$ref":"#/$defs/project"},"token":{"$ref":"#/$defs/verifiedToken"},"launch":{"$ref":"#/$defs/launch"},"proof":{"$ref":"#/$defs/graduatedVerifiedProof"}}};
const schema106 = {"type":"object","additionalProperties":false,"required":["stage","availability","sourceArtifacts","observation","supply","authorities","creatorBalance","allocations","quote","creatorFirstBuy","vesting","fees","cost","metadata","transactions","links","graduation","pool","lpDisposition"],"properties":{"stage":{"const":"graduated"},"availability":{"const":"verified"},"sourceArtifacts":{"$ref":"#/$defs/graduatedSourceArtifacts"},"observation":{"$ref":"#/$defs/observation"},"supply":{"$ref":"#/$defs/supply"},"authorities":{"$ref":"#/$defs/graduatedAuthorities"},"creatorBalance":{"$ref":"#/$defs/creatorBalance"},"allocations":{"$ref":"#/$defs/allocations"},"quote":{"$ref":"#/$defs/quote"},"creatorFirstBuy":{"$ref":"#/$defs/creatorFirstBuy"},"vesting":{"$ref":"#/$defs/vesting"},"fees":{"$ref":"#/$defs/fees"},"cost":{"$ref":"#/$defs/graduatedCost"},"metadata":{"$ref":"#/$defs/metadata"},"transactions":{"$ref":"#/$defs/graduatedTransactions"},"links":{"$ref":"#/$defs/graduatedLinks"},"graduation":{"$ref":"#/$defs/graduation"},"pool":{"$ref":"#/$defs/pool"},"lpDisposition":{"$ref":"#/$defs/lpDisposition"}}};
const schema111 = {"type":"object","additionalProperties":false,"required":["mintAuthority","authorityKind","freezeAuthority"],"properties":{"mintAuthority":{"type":"null"},"authorityKind":{"type":"null"},"freezeAuthority":{"type":"null"}}};
const schema122 = {"type":"object","additionalProperties":false,"required":["solscanMint","solscanCreationTransaction","solscanGraduationTransaction","raydiumLaunchlab","raydiumPool"],"properties":{"solscanMint":{"type":"string","pattern":"^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},"solscanCreationTransaction":{"type":"string","pattern":"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},"solscanGraduationTransaction":{"type":"string","pattern":"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},"raydiumLaunchlab":{"type":"string","pattern":"^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},"raydiumPool":{"type":"string","pattern":"^https://raydium\\.io/liquidity-pools/[1-9A-HJ-NP-Za-km-z]{32,44}$"}}};
const schema107 = {"type":"object","additionalProperties":false,"required":["mint","launchlab","graduation"],"properties":{"mint":{"$ref":"#/$defs/mintArtifact"},"launchlab":{"$ref":"#/$defs/launchlabArtifact"},"graduation":{"$ref":"#/$defs/graduationArtifact"}}};
const schema108 = {"type":"object","additionalProperties":false,"required":["path","sha256","schemaVersion"],"properties":{"path":{"const":"proof/mainnet-graduation.json"},"sha256":{"$ref":"#/$defs/sha256"},"schemaVersion":{"const":1}}};

function validate63(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate63.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.path === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.sha256 === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "sha256"},message:"must have required property '"+"sha256"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.schemaVersion === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "path") || (key0 === "sha256")) || (key0 === "schemaVersion"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.path !== undefined){
if("proof/mainnet-graduation.json" !== data.path){
const err4 = {instancePath:instancePath+"/path",schemaPath:"#/properties/path/const",keyword:"const",params:{allowedValue: "proof/mainnet-graduation.json"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.sha256 !== undefined){
let data1 = data.sha256;
if(typeof data1 === "string"){
if(!pattern5.test(data1)){
const err5 = {instancePath:instancePath+"/sha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
else {
const err6 = {instancePath:instancePath+"/sha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(1 !== data.schemaVersion){
const err7 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
validate63.errors = vErrors;
return errors === 0;
}
validate63.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate60(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate60.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.mint === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "mint"},message:"must have required property '"+"mint"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.launchlab === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "launchlab"},message:"must have required property '"+"launchlab"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.graduation === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "graduation"},message:"must have required property '"+"graduation"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "mint") || (key0 === "launchlab")) || (key0 === "graduation"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.mint !== undefined){
if(!(validate30(data.mint, {instancePath:instancePath+"/mint",parentData:data,parentDataProperty:"mint",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate30.errors : vErrors.concat(validate30.errors);
errors = vErrors.length;
}
}
if(data.launchlab !== undefined){
if(!(validate32(data.launchlab, {instancePath:instancePath+"/launchlab",parentData:data,parentDataProperty:"launchlab",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate32.errors : vErrors.concat(validate32.errors);
errors = vErrors.length;
}
}
if(data.graduation !== undefined){
if(!(validate63(data.graduation, {instancePath:instancePath+"/graduation",parentData:data,parentDataProperty:"graduation",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate63.errors : vErrors.concat(validate63.errors);
errors = vErrors.length;
}
}
}
else {
const err4 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
validate60.errors = vErrors;
return errors === 0;
}
validate60.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema115 = {"type":"object","additionalProperties":false,"required":["metadataUploadLamports","creationDebitLamports","recoveryDebitLamports","graduationDebitLamports","cumulativeCreatorDebitLamports","capLamports","withinCap"],"properties":{"metadataUploadLamports":{"$ref":"#/$defs/unsignedDecimal"},"creationDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"recoveryDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"graduationDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"cumulativeCreatorDebitLamports":{"$ref":"#/$defs/unsignedDecimal"},"capLamports":{"const":"1000000000"},"withinCap":{"const":true}}};

function validate70(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate70.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.metadataUploadLamports === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "metadataUploadLamports"},message:"must have required property '"+"metadataUploadLamports"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.creationDebitLamports === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creationDebitLamports"},message:"must have required property '"+"creationDebitLamports"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.recoveryDebitLamports === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "recoveryDebitLamports"},message:"must have required property '"+"recoveryDebitLamports"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.graduationDebitLamports === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "graduationDebitLamports"},message:"must have required property '"+"graduationDebitLamports"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.cumulativeCreatorDebitLamports === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "cumulativeCreatorDebitLamports"},message:"must have required property '"+"cumulativeCreatorDebitLamports"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.capLamports === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "capLamports"},message:"must have required property '"+"capLamports"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.withinCap === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "withinCap"},message:"must have required property '"+"withinCap"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "metadataUploadLamports") || (key0 === "creationDebitLamports")) || (key0 === "recoveryDebitLamports")) || (key0 === "graduationDebitLamports")) || (key0 === "cumulativeCreatorDebitLamports")) || (key0 === "capLamports")) || (key0 === "withinCap"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.metadataUploadLamports !== undefined){
let data0 = data.metadataUploadLamports;
if(typeof data0 === "string"){
if(!pattern14.test(data0)){
const err8 = {instancePath:instancePath+"/metadataUploadLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/metadataUploadLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.creationDebitLamports !== undefined){
let data1 = data.creationDebitLamports;
if(typeof data1 === "string"){
if(!pattern14.test(data1)){
const err10 = {instancePath:instancePath+"/creationDebitLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/creationDebitLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.recoveryDebitLamports !== undefined){
let data2 = data.recoveryDebitLamports;
if(typeof data2 === "string"){
if(!pattern14.test(data2)){
const err12 = {instancePath:instancePath+"/recoveryDebitLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/recoveryDebitLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.graduationDebitLamports !== undefined){
let data3 = data.graduationDebitLamports;
if(typeof data3 === "string"){
if(!pattern14.test(data3)){
const err14 = {instancePath:instancePath+"/graduationDebitLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/graduationDebitLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.cumulativeCreatorDebitLamports !== undefined){
let data4 = data.cumulativeCreatorDebitLamports;
if(typeof data4 === "string"){
if(!pattern14.test(data4)){
const err16 = {instancePath:instancePath+"/cumulativeCreatorDebitLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/cumulativeCreatorDebitLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.capLamports !== undefined){
if("1000000000" !== data.capLamports){
const err18 = {instancePath:instancePath+"/capLamports",schemaPath:"#/properties/capLamports/const",keyword:"const",params:{allowedValue: "1000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.withinCap !== undefined){
if(true !== data.withinCap){
const err19 = {instancePath:instancePath+"/withinCap",schemaPath:"#/properties/withinCap/const",keyword:"const",params:{allowedValue: true},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
}
else {
const err20 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
validate70.errors = vErrors;
return errors === 0;
}
validate70.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema121 = {"type":"object","additionalProperties":false,"required":["creation","graduation"],"properties":{"creation":{"$ref":"#/$defs/transaction"},"graduation":{"$ref":"#/$defs/transaction"}}};

function validate73(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate73.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.creation === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creation"},message:"must have required property '"+"creation"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.graduation === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "graduation"},message:"must have required property '"+"graduation"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "creation") || (key0 === "graduation"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.creation !== undefined){
if(!(validate50(data.creation, {instancePath:instancePath+"/creation",parentData:data,parentDataProperty:"creation",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate50.errors : vErrors.concat(validate50.errors);
errors = vErrors.length;
}
}
if(data.graduation !== undefined){
if(!(validate50(data.graduation, {instancePath:instancePath+"/graduation",parentData:data,parentDataProperty:"graduation",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate50.errors : vErrors.concat(validate50.errors);
errors = vErrors.length;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate73.errors = vErrors;
return errors === 0;
}
validate73.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema123 = {"type":"object","additionalProperties":false,"required":["configuredThresholdLamports","observedQuoteBalanceLamports","status","finalizedSlot","finalizedAt"],"properties":{"configuredThresholdLamports":{"$ref":"#/$defs/unsignedDecimal"},"observedQuoteBalanceLamports":{"$ref":"#/$defs/unsignedDecimal"},"status":{"const":"graduated"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}};

function validate77(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate77.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.configuredThresholdLamports === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "configuredThresholdLamports"},message:"must have required property '"+"configuredThresholdLamports"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.observedQuoteBalanceLamports === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "observedQuoteBalanceLamports"},message:"must have required property '"+"observedQuoteBalanceLamports"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.status === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.finalizedSlot === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.finalizedAt === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key0 in data){
if(!(((((key0 === "configuredThresholdLamports") || (key0 === "observedQuoteBalanceLamports")) || (key0 === "status")) || (key0 === "finalizedSlot")) || (key0 === "finalizedAt"))){
const err5 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.configuredThresholdLamports !== undefined){
let data0 = data.configuredThresholdLamports;
if(typeof data0 === "string"){
if(!pattern14.test(data0)){
const err6 = {instancePath:instancePath+"/configuredThresholdLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/configuredThresholdLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.observedQuoteBalanceLamports !== undefined){
let data1 = data.observedQuoteBalanceLamports;
if(typeof data1 === "string"){
if(!pattern14.test(data1)){
const err8 = {instancePath:instancePath+"/observedQuoteBalanceLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/observedQuoteBalanceLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.status !== undefined){
if("graduated" !== data.status){
const err10 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "graduated"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.finalizedSlot !== undefined){
let data3 = data.finalizedSlot;
if(!(((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3))) && (isFinite(data3)))){
const err11 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if((typeof data3 == "number") && (isFinite(data3))){
if(data3 > 9007199254740991 || isNaN(data3)){
const err12 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data3 < 0 || isNaN(data3)){
const err13 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
}
if(data.finalizedAt !== undefined){
let data4 = data.finalizedAt;
if(typeof data4 === "string"){
if(!pattern7.test(data4)){
const err14 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"+"\""};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
else {
const err15 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
validate77.errors = vErrors;
return errors === 0;
}
validate77.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema128 = {"type":"object","additionalProperties":false,"required":["address","programId","quoteVault","quoteVaultBalanceLamports","accountSha256"],"properties":{"address":{"$ref":"#/$defs/publicKey"},"programId":{"enum":["CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C","675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"]},"quoteVault":{"$ref":"#/$defs/publicKey"},"quoteVaultBalanceLamports":{"$ref":"#/$defs/unsignedDecimal"},"accountSha256":{"$ref":"#/$defs/sha256"}}};

function validate79(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate79.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.address === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.programId === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "programId"},message:"must have required property '"+"programId"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.quoteVault === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "quoteVault"},message:"must have required property '"+"quoteVault"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.quoteVaultBalanceLamports === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "quoteVaultBalanceLamports"},message:"must have required property '"+"quoteVaultBalanceLamports"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.accountSha256 === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key0 in data){
if(!(((((key0 === "address") || (key0 === "programId")) || (key0 === "quoteVault")) || (key0 === "quoteVaultBalanceLamports")) || (key0 === "accountSha256"))){
const err5 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.address !== undefined){
let data0 = data.address;
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
const err6 = {instancePath:instancePath+"/address",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
else {
const err7 = {instancePath:instancePath+"/address",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.programId !== undefined){
let data1 = data.programId;
if(!((data1 === "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C") || (data1 === "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"))){
const err8 = {instancePath:instancePath+"/programId",schemaPath:"#/properties/programId/enum",keyword:"enum",params:{allowedValues: schema128.properties.programId.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.quoteVault !== undefined){
let data2 = data.quoteVault;
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
const err9 = {instancePath:instancePath+"/quoteVault",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
else {
const err10 = {instancePath:instancePath+"/quoteVault",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.quoteVaultBalanceLamports !== undefined){
let data3 = data.quoteVaultBalanceLamports;
if(typeof data3 === "string"){
if(!pattern14.test(data3)){
const err11 = {instancePath:instancePath+"/quoteVaultBalanceLamports",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
else {
const err12 = {instancePath:instancePath+"/quoteVaultBalanceLamports",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.accountSha256 !== undefined){
let data4 = data.accountSha256;
if(typeof data4 === "string"){
if(!pattern5.test(data4)){
const err13 = {instancePath:instancePath+"/accountSha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
else {
const err14 = {instancePath:instancePath+"/accountSha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
}
else {
const err15 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
validate79.errors = vErrors;
return errors === 0;
}
validate79.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema133 = {"oneOf":[{"type":"object","additionalProperties":false,"required":["kind","lpMint","lockedPosition","lockProgram","lockNftMint","lockNftTokenAccount","lockVault","platformLpBps","creatorLpBps","irreversibleLpBps","withdrawalAuthority","feeKey","feeRights","recoverableLpBaseUnits","evidenceAccounts"],"properties":{"kind":{"const":"burn-and-earn"},"lpMint":{"$ref":"#/$defs/publicKey"},"lockedPosition":{"$ref":"#/$defs/publicKey"},"lockProgram":{"const":"LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE"},"lockNftMint":{"$ref":"#/$defs/publicKey"},"lockNftTokenAccount":{"$ref":"#/$defs/publicKey"},"lockVault":{"$ref":"#/$defs/publicKey"},"platformLpBps":{"const":0},"creatorLpBps":{"const":0},"irreversibleLpBps":{"const":10000},"withdrawalAuthority":{"type":"null"},"feeKey":{"type":"null"},"feeRights":{"type":"array","maxItems":0},"recoverableLpBaseUnits":{"const":"0"},"evidenceAccounts":{"$ref":"#/$defs/cpmmEvidenceAccounts"}}},{"type":"object","additionalProperties":false,"required":["kind","lpMint","burnedBaseUnits","totalSupplyBaseUnits","creatorLpBaseUnits","platformLpBaseUnits","recoverableLpBaseUnits","withdrawalAuthority","feeKey","feeRights","evidenceAccounts"],"properties":{"kind":{"const":"lp-burn"},"lpMint":{"$ref":"#/$defs/publicKey"},"burnedBaseUnits":{"$ref":"#/$defs/unsignedDecimal"},"totalSupplyBaseUnits":{"$ref":"#/$defs/unsignedDecimal"},"creatorLpBaseUnits":{"const":"0"},"platformLpBaseUnits":{"const":"0"},"recoverableLpBaseUnits":{"const":"0"},"withdrawalAuthority":{"type":"null"},"feeKey":{"type":"null"},"feeRights":{"type":"array","maxItems":0},"evidenceAccounts":{"$ref":"#/$defs/ammEvidenceAccounts"}}}]};
const schema139 = {"type":"array","minItems":6,"maxItems":6,"items":{"$ref":"#/$defs/cpmmEvidenceAccount"},"allOf":[{"contains":{"$ref":"#/$defs/cpmmRoleLpMint"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleLockedPosition"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleLockNftMint"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleLockNftTokenAccount"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleLockVault"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/cpmmRoleFeeRightAccount"},"minContains":1,"maxContains":1}]};
const schema140 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lp-mint"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema141 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"locked-position"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema142 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lock-nft-mint"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema143 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lock-nft-token-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema144 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lock-vault"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema145 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"fee-right-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema146 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"enum":["lp-mint","locked-position","lock-nft-mint","lock-nft-token-account","lock-vault","fee-right-account"]},"address":{"$ref":"#/$defs/publicKey"},"ownerProgram":{"$ref":"#/$defs/publicKey"},"accountSha256":{"$ref":"#/$defs/sha256"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}};

function validate83(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate83.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.role === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.address === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.ownerProgram === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.accountSha256 === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.finalizedSlot === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.finalizedAt === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
for(const key0 in data){
if(!((((((key0 === "role") || (key0 === "address")) || (key0 === "ownerProgram")) || (key0 === "accountSha256")) || (key0 === "finalizedSlot")) || (key0 === "finalizedAt"))){
const err6 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.role !== undefined){
let data0 = data.role;
if(!((((((data0 === "lp-mint") || (data0 === "locked-position")) || (data0 === "lock-nft-mint")) || (data0 === "lock-nft-token-account")) || (data0 === "lock-vault")) || (data0 === "fee-right-account"))){
const err7 = {instancePath:instancePath+"/role",schemaPath:"#/properties/role/enum",keyword:"enum",params:{allowedValues: schema146.properties.role.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.address !== undefined){
let data1 = data.address;
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
const err8 = {instancePath:instancePath+"/address",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/address",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.ownerProgram !== undefined){
let data2 = data.ownerProgram;
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
const err10 = {instancePath:instancePath+"/ownerProgram",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/ownerProgram",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.accountSha256 !== undefined){
let data3 = data.accountSha256;
if(typeof data3 === "string"){
if(!pattern5.test(data3)){
const err12 = {instancePath:instancePath+"/accountSha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/accountSha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.finalizedSlot !== undefined){
let data4 = data.finalizedSlot;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
const err14 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740991 || isNaN(data4)){
const err15 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data4 < 0 || isNaN(data4)){
const err16 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
if(data.finalizedAt !== undefined){
let data5 = data.finalizedAt;
if(typeof data5 === "string"){
if(!pattern7.test(data5)){
const err17 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"+"\""};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
else {
const err18 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
}
else {
const err19 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
validate83.errors = vErrors;
return errors === 0;
}
validate83.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate82(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate82.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(Array.isArray(data)){
const _errs2 = errors;
const len0 = data.length;
let valid1 = false;
let count0 = 0;
for(let i0=0; i0<len0; i0++){
let data0 = data[i0];
const _errs3 = errors;
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
if(data0.role === undefined){
const err0 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/cpmmRoleLpMint/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data0.address === undefined){
const err1 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/cpmmRoleLpMint/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data0.ownerProgram === undefined){
const err2 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/cpmmRoleLpMint/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0.accountSha256 === undefined){
const err3 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/cpmmRoleLpMint/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data0.finalizedSlot === undefined){
const err4 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/cpmmRoleLpMint/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data0.finalizedAt === undefined){
const err5 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/cpmmRoleLpMint/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
for(const key0 in data0){
if(!((((((key0 === "role") || (key0 === "address")) || (key0 === "ownerProgram")) || (key0 === "accountSha256")) || (key0 === "finalizedSlot")) || (key0 === "finalizedAt"))){
const err6 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/cpmmRoleLpMint/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data0.role !== undefined){
if("lp-mint" !== data0.role){
const err7 = {instancePath:instancePath+"/" + i0+"/role",schemaPath:"#/$defs/cpmmRoleLpMint/properties/role/const",keyword:"const",params:{allowedValue: "lp-mint"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/cpmmRoleLpMint/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid0 = _errs3 === errors;
if(_valid0){
count0++;
if(count0 > 1){
valid1 = false;
break;
}
valid1 = true;
}
}
if(!valid1){
const err9 = {instancePath,schemaPath:"#/allOf/0/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
else {
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs9 = errors;
const len1 = data.length;
let valid4 = false;
let count1 = 0;
for(let i1=0; i1<len1; i1++){
let data2 = data[i1];
const _errs10 = errors;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.role === undefined){
const err10 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/cpmmRoleLockedPosition/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data2.address === undefined){
const err11 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/cpmmRoleLockedPosition/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data2.ownerProgram === undefined){
const err12 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/cpmmRoleLockedPosition/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data2.accountSha256 === undefined){
const err13 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/cpmmRoleLockedPosition/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data2.finalizedSlot === undefined){
const err14 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/cpmmRoleLockedPosition/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data2.finalizedAt === undefined){
const err15 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/cpmmRoleLockedPosition/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key1 in data2){
if(!((((((key1 === "role") || (key1 === "address")) || (key1 === "ownerProgram")) || (key1 === "accountSha256")) || (key1 === "finalizedSlot")) || (key1 === "finalizedAt"))){
const err16 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/cpmmRoleLockedPosition/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data2.role !== undefined){
if("locked-position" !== data2.role){
const err17 = {instancePath:instancePath+"/" + i1+"/role",schemaPath:"#/$defs/cpmmRoleLockedPosition/properties/role/const",keyword:"const",params:{allowedValue: "locked-position"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/cpmmRoleLockedPosition/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid1 = _errs10 === errors;
if(_valid1){
count1++;
if(count1 > 1){
valid4 = false;
break;
}
valid4 = true;
}
}
if(!valid4){
const err19 = {instancePath,schemaPath:"#/allOf/1/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
else {
errors = _errs9;
if(vErrors !== null){
if(_errs9){
vErrors.length = _errs9;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs16 = errors;
const len2 = data.length;
let valid7 = false;
let count2 = 0;
for(let i2=0; i2<len2; i2++){
let data4 = data[i2];
const _errs17 = errors;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.role === undefined){
const err20 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/cpmmRoleLockNftMint/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data4.address === undefined){
const err21 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/cpmmRoleLockNftMint/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data4.ownerProgram === undefined){
const err22 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/cpmmRoleLockNftMint/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data4.accountSha256 === undefined){
const err23 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/cpmmRoleLockNftMint/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data4.finalizedSlot === undefined){
const err24 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/cpmmRoleLockNftMint/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data4.finalizedAt === undefined){
const err25 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/cpmmRoleLockNftMint/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
for(const key2 in data4){
if(!((((((key2 === "role") || (key2 === "address")) || (key2 === "ownerProgram")) || (key2 === "accountSha256")) || (key2 === "finalizedSlot")) || (key2 === "finalizedAt"))){
const err26 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/cpmmRoleLockNftMint/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data4.role !== undefined){
if("lock-nft-mint" !== data4.role){
const err27 = {instancePath:instancePath+"/" + i2+"/role",schemaPath:"#/$defs/cpmmRoleLockNftMint/properties/role/const",keyword:"const",params:{allowedValue: "lock-nft-mint"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
else {
const err28 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/cpmmRoleLockNftMint/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
var _valid2 = _errs17 === errors;
if(_valid2){
count2++;
if(count2 > 1){
valid7 = false;
break;
}
valid7 = true;
}
}
if(!valid7){
const err29 = {instancePath,schemaPath:"#/allOf/2/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs23 = errors;
const len3 = data.length;
let valid10 = false;
let count3 = 0;
for(let i3=0; i3<len3; i3++){
let data6 = data[i3];
const _errs24 = errors;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.role === undefined){
const err30 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data6.address === undefined){
const err31 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data6.ownerProgram === undefined){
const err32 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data6.accountSha256 === undefined){
const err33 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data6.finalizedSlot === undefined){
const err34 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(data6.finalizedAt === undefined){
const err35 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
for(const key3 in data6){
if(!((((((key3 === "role") || (key3 === "address")) || (key3 === "ownerProgram")) || (key3 === "accountSha256")) || (key3 === "finalizedSlot")) || (key3 === "finalizedAt"))){
const err36 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data6.role !== undefined){
if("lock-nft-token-account" !== data6.role){
const err37 = {instancePath:instancePath+"/" + i3+"/role",schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/properties/role/const",keyword:"const",params:{allowedValue: "lock-nft-token-account"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
}
else {
const err38 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/cpmmRoleLockNftTokenAccount/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
var _valid3 = _errs24 === errors;
if(_valid3){
count3++;
if(count3 > 1){
valid10 = false;
break;
}
valid10 = true;
}
}
if(!valid10){
const err39 = {instancePath,schemaPath:"#/allOf/3/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
else {
errors = _errs23;
if(vErrors !== null){
if(_errs23){
vErrors.length = _errs23;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs30 = errors;
const len4 = data.length;
let valid13 = false;
let count4 = 0;
for(let i4=0; i4<len4; i4++){
let data8 = data[i4];
const _errs31 = errors;
if(data8 && typeof data8 == "object" && !Array.isArray(data8)){
if(data8.role === undefined){
const err40 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/cpmmRoleLockVault/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data8.address === undefined){
const err41 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/cpmmRoleLockVault/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data8.ownerProgram === undefined){
const err42 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/cpmmRoleLockVault/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data8.accountSha256 === undefined){
const err43 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/cpmmRoleLockVault/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data8.finalizedSlot === undefined){
const err44 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/cpmmRoleLockVault/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data8.finalizedAt === undefined){
const err45 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/cpmmRoleLockVault/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
for(const key4 in data8){
if(!((((((key4 === "role") || (key4 === "address")) || (key4 === "ownerProgram")) || (key4 === "accountSha256")) || (key4 === "finalizedSlot")) || (key4 === "finalizedAt"))){
const err46 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/cpmmRoleLockVault/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data8.role !== undefined){
if("lock-vault" !== data8.role){
const err47 = {instancePath:instancePath+"/" + i4+"/role",schemaPath:"#/$defs/cpmmRoleLockVault/properties/role/const",keyword:"const",params:{allowedValue: "lock-vault"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
}
else {
const err48 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/cpmmRoleLockVault/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
var _valid4 = _errs31 === errors;
if(_valid4){
count4++;
if(count4 > 1){
valid13 = false;
break;
}
valid13 = true;
}
}
if(!valid13){
const err49 = {instancePath,schemaPath:"#/allOf/4/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
else {
errors = _errs30;
if(vErrors !== null){
if(_errs30){
vErrors.length = _errs30;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs37 = errors;
const len5 = data.length;
let valid16 = false;
let count5 = 0;
for(let i5=0; i5<len5; i5++){
let data10 = data[i5];
const _errs38 = errors;
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
if(data10.role === undefined){
const err50 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/cpmmRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data10.address === undefined){
const err51 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/cpmmRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(data10.ownerProgram === undefined){
const err52 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/cpmmRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data10.accountSha256 === undefined){
const err53 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/cpmmRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data10.finalizedSlot === undefined){
const err54 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/cpmmRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if(data10.finalizedAt === undefined){
const err55 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/cpmmRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
for(const key5 in data10){
if(!((((((key5 === "role") || (key5 === "address")) || (key5 === "ownerProgram")) || (key5 === "accountSha256")) || (key5 === "finalizedSlot")) || (key5 === "finalizedAt"))){
const err56 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/cpmmRoleFeeRightAccount/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
if(data10.role !== undefined){
if("fee-right-account" !== data10.role){
const err57 = {instancePath:instancePath+"/" + i5+"/role",schemaPath:"#/$defs/cpmmRoleFeeRightAccount/properties/role/const",keyword:"const",params:{allowedValue: "fee-right-account"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
}
else {
const err58 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/cpmmRoleFeeRightAccount/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
var _valid5 = _errs38 === errors;
if(_valid5){
count5++;
if(count5 > 1){
valid16 = false;
break;
}
valid16 = true;
}
}
if(!valid16){
const err59 = {instancePath,schemaPath:"#/allOf/5/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
else {
errors = _errs37;
if(vErrors !== null){
if(_errs37){
vErrors.length = _errs37;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
if(data.length > 6){
const err60 = {instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 6},message:"must NOT have more than 6 items"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
if(data.length < 6){
const err61 = {instancePath,schemaPath:"#/minItems",keyword:"minItems",params:{limit: 6},message:"must NOT have fewer than 6 items"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
const len6 = data.length;
for(let i6=0; i6<len6; i6++){
if(!(validate83(data[i6], {instancePath:instancePath+"/" + i6,parentData:data,parentDataProperty:i6,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate83.errors : vErrors.concat(validate83.errors);
errors = vErrors.length;
}
}
}
else {
const err62 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
validate82.errors = vErrors;
return errors === 0;
}
validate82.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};

const schema155 = {"type":"array","minItems":6,"maxItems":6,"items":{"$ref":"#/$defs/ammEvidenceAccount"},"allOf":[{"contains":{"$ref":"#/$defs/ammRoleLpMint"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRoleBurnSource"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRoleCreatorLpAccount"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRolePlatformLpAccount"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRoleWithdrawalQueue"},"minContains":1,"maxContains":1},{"contains":{"$ref":"#/$defs/ammRoleFeeRightAccount"},"minContains":1,"maxContains":1}]};
const schema156 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"lp-mint"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema157 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"burn-source"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema158 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"creator-lp-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema159 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"platform-lp-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema160 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"withdrawal-queue"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema161 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"const":"fee-right-account"},"address":true,"ownerProgram":true,"accountSha256":true,"finalizedSlot":true,"finalizedAt":true}};
const schema162 = {"type":"object","additionalProperties":false,"required":["role","address","ownerProgram","accountSha256","finalizedSlot","finalizedAt"],"properties":{"role":{"enum":["lp-mint","burn-source","creator-lp-account","platform-lp-account","withdrawal-queue","fee-right-account"]},"address":{"$ref":"#/$defs/publicKey"},"ownerProgram":{"$ref":"#/$defs/publicKey"},"accountSha256":{"$ref":"#/$defs/sha256"},"finalizedSlot":{"$ref":"#/$defs/slot"},"finalizedAt":{"$ref":"#/$defs/timestamp"}}};

function validate87(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate87.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.role === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.address === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.ownerProgram === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.accountSha256 === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.finalizedSlot === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.finalizedAt === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
for(const key0 in data){
if(!((((((key0 === "role") || (key0 === "address")) || (key0 === "ownerProgram")) || (key0 === "accountSha256")) || (key0 === "finalizedSlot")) || (key0 === "finalizedAt"))){
const err6 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.role !== undefined){
let data0 = data.role;
if(!((((((data0 === "lp-mint") || (data0 === "burn-source")) || (data0 === "creator-lp-account")) || (data0 === "platform-lp-account")) || (data0 === "withdrawal-queue")) || (data0 === "fee-right-account"))){
const err7 = {instancePath:instancePath+"/role",schemaPath:"#/properties/role/enum",keyword:"enum",params:{allowedValues: schema162.properties.role.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.address !== undefined){
let data1 = data.address;
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
const err8 = {instancePath:instancePath+"/address",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
else {
const err9 = {instancePath:instancePath+"/address",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.ownerProgram !== undefined){
let data2 = data.ownerProgram;
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
const err10 = {instancePath:instancePath+"/ownerProgram",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/ownerProgram",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.accountSha256 !== undefined){
let data3 = data.accountSha256;
if(typeof data3 === "string"){
if(!pattern5.test(data3)){
const err12 = {instancePath:instancePath+"/accountSha256",schemaPath:"#/$defs/sha256/pattern",keyword:"pattern",params:{pattern: "^[0-9a-f]{64}$"},message:"must match pattern \""+"^[0-9a-f]{64}$"+"\""};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
else {
const err13 = {instancePath:instancePath+"/accountSha256",schemaPath:"#/$defs/sha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.finalizedSlot !== undefined){
let data4 = data.finalizedSlot;
if(!(((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4))) && (isFinite(data4)))){
const err14 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if((typeof data4 == "number") && (isFinite(data4))){
if(data4 > 9007199254740991 || isNaN(data4)){
const err15 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/maximum",keyword:"maximum",params:{comparison: "<=", limit: 9007199254740991},message:"must be <= 9007199254740991"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data4 < 0 || isNaN(data4)){
const err16 = {instancePath:instancePath+"/finalizedSlot",schemaPath:"#/$defs/slot/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
}
if(data.finalizedAt !== undefined){
let data5 = data.finalizedAt;
if(typeof data5 === "string"){
if(!pattern7.test(data5)){
const err17 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/pattern",keyword:"pattern",params:{pattern: "^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"},message:"must match pattern \""+"^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$"+"\""};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
else {
const err18 = {instancePath:instancePath+"/finalizedAt",schemaPath:"#/$defs/timestamp/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
}
else {
const err19 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
validate87.errors = vErrors;
return errors === 0;
}
validate87.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate86(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate86.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(Array.isArray(data)){
const _errs2 = errors;
const len0 = data.length;
let valid1 = false;
let count0 = 0;
for(let i0=0; i0<len0; i0++){
let data0 = data[i0];
const _errs3 = errors;
if(data0 && typeof data0 == "object" && !Array.isArray(data0)){
if(data0.role === undefined){
const err0 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/ammRoleLpMint/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data0.address === undefined){
const err1 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/ammRoleLpMint/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data0.ownerProgram === undefined){
const err2 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/ammRoleLpMint/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data0.accountSha256 === undefined){
const err3 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/ammRoleLpMint/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data0.finalizedSlot === undefined){
const err4 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/ammRoleLpMint/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data0.finalizedAt === undefined){
const err5 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/ammRoleLpMint/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
for(const key0 in data0){
if(!((((((key0 === "role") || (key0 === "address")) || (key0 === "ownerProgram")) || (key0 === "accountSha256")) || (key0 === "finalizedSlot")) || (key0 === "finalizedAt"))){
const err6 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/ammRoleLpMint/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data0.role !== undefined){
if("lp-mint" !== data0.role){
const err7 = {instancePath:instancePath+"/" + i0+"/role",schemaPath:"#/$defs/ammRoleLpMint/properties/role/const",keyword:"const",params:{allowedValue: "lp-mint"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath:instancePath+"/" + i0,schemaPath:"#/$defs/ammRoleLpMint/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
var _valid0 = _errs3 === errors;
if(_valid0){
count0++;
if(count0 > 1){
valid1 = false;
break;
}
valid1 = true;
}
}
if(!valid1){
const err9 = {instancePath,schemaPath:"#/allOf/0/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
else {
errors = _errs2;
if(vErrors !== null){
if(_errs2){
vErrors.length = _errs2;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs9 = errors;
const len1 = data.length;
let valid4 = false;
let count1 = 0;
for(let i1=0; i1<len1; i1++){
let data2 = data[i1];
const _errs10 = errors;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.role === undefined){
const err10 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/ammRoleBurnSource/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data2.address === undefined){
const err11 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/ammRoleBurnSource/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data2.ownerProgram === undefined){
const err12 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/ammRoleBurnSource/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data2.accountSha256 === undefined){
const err13 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/ammRoleBurnSource/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data2.finalizedSlot === undefined){
const err14 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/ammRoleBurnSource/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data2.finalizedAt === undefined){
const err15 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/ammRoleBurnSource/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key1 in data2){
if(!((((((key1 === "role") || (key1 === "address")) || (key1 === "ownerProgram")) || (key1 === "accountSha256")) || (key1 === "finalizedSlot")) || (key1 === "finalizedAt"))){
const err16 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/ammRoleBurnSource/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data2.role !== undefined){
if("burn-source" !== data2.role){
const err17 = {instancePath:instancePath+"/" + i1+"/role",schemaPath:"#/$defs/ammRoleBurnSource/properties/role/const",keyword:"const",params:{allowedValue: "burn-source"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
else {
const err18 = {instancePath:instancePath+"/" + i1,schemaPath:"#/$defs/ammRoleBurnSource/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
var _valid1 = _errs10 === errors;
if(_valid1){
count1++;
if(count1 > 1){
valid4 = false;
break;
}
valid4 = true;
}
}
if(!valid4){
const err19 = {instancePath,schemaPath:"#/allOf/1/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
else {
errors = _errs9;
if(vErrors !== null){
if(_errs9){
vErrors.length = _errs9;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs16 = errors;
const len2 = data.length;
let valid7 = false;
let count2 = 0;
for(let i2=0; i2<len2; i2++){
let data4 = data[i2];
const _errs17 = errors;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.role === undefined){
const err20 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/ammRoleCreatorLpAccount/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data4.address === undefined){
const err21 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/ammRoleCreatorLpAccount/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data4.ownerProgram === undefined){
const err22 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/ammRoleCreatorLpAccount/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data4.accountSha256 === undefined){
const err23 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/ammRoleCreatorLpAccount/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data4.finalizedSlot === undefined){
const err24 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/ammRoleCreatorLpAccount/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data4.finalizedAt === undefined){
const err25 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/ammRoleCreatorLpAccount/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
for(const key2 in data4){
if(!((((((key2 === "role") || (key2 === "address")) || (key2 === "ownerProgram")) || (key2 === "accountSha256")) || (key2 === "finalizedSlot")) || (key2 === "finalizedAt"))){
const err26 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/ammRoleCreatorLpAccount/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data4.role !== undefined){
if("creator-lp-account" !== data4.role){
const err27 = {instancePath:instancePath+"/" + i2+"/role",schemaPath:"#/$defs/ammRoleCreatorLpAccount/properties/role/const",keyword:"const",params:{allowedValue: "creator-lp-account"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
else {
const err28 = {instancePath:instancePath+"/" + i2,schemaPath:"#/$defs/ammRoleCreatorLpAccount/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
var _valid2 = _errs17 === errors;
if(_valid2){
count2++;
if(count2 > 1){
valid7 = false;
break;
}
valid7 = true;
}
}
if(!valid7){
const err29 = {instancePath,schemaPath:"#/allOf/2/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
else {
errors = _errs16;
if(vErrors !== null){
if(_errs16){
vErrors.length = _errs16;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs23 = errors;
const len3 = data.length;
let valid10 = false;
let count3 = 0;
for(let i3=0; i3<len3; i3++){
let data6 = data[i3];
const _errs24 = errors;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.role === undefined){
const err30 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/ammRolePlatformLpAccount/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data6.address === undefined){
const err31 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/ammRolePlatformLpAccount/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data6.ownerProgram === undefined){
const err32 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/ammRolePlatformLpAccount/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data6.accountSha256 === undefined){
const err33 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/ammRolePlatformLpAccount/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data6.finalizedSlot === undefined){
const err34 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/ammRolePlatformLpAccount/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(data6.finalizedAt === undefined){
const err35 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/ammRolePlatformLpAccount/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
for(const key3 in data6){
if(!((((((key3 === "role") || (key3 === "address")) || (key3 === "ownerProgram")) || (key3 === "accountSha256")) || (key3 === "finalizedSlot")) || (key3 === "finalizedAt"))){
const err36 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/ammRolePlatformLpAccount/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data6.role !== undefined){
if("platform-lp-account" !== data6.role){
const err37 = {instancePath:instancePath+"/" + i3+"/role",schemaPath:"#/$defs/ammRolePlatformLpAccount/properties/role/const",keyword:"const",params:{allowedValue: "platform-lp-account"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
}
else {
const err38 = {instancePath:instancePath+"/" + i3,schemaPath:"#/$defs/ammRolePlatformLpAccount/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
var _valid3 = _errs24 === errors;
if(_valid3){
count3++;
if(count3 > 1){
valid10 = false;
break;
}
valid10 = true;
}
}
if(!valid10){
const err39 = {instancePath,schemaPath:"#/allOf/3/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
else {
errors = _errs23;
if(vErrors !== null){
if(_errs23){
vErrors.length = _errs23;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs30 = errors;
const len4 = data.length;
let valid13 = false;
let count4 = 0;
for(let i4=0; i4<len4; i4++){
let data8 = data[i4];
const _errs31 = errors;
if(data8 && typeof data8 == "object" && !Array.isArray(data8)){
if(data8.role === undefined){
const err40 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/ammRoleWithdrawalQueue/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data8.address === undefined){
const err41 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/ammRoleWithdrawalQueue/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data8.ownerProgram === undefined){
const err42 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/ammRoleWithdrawalQueue/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data8.accountSha256 === undefined){
const err43 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/ammRoleWithdrawalQueue/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data8.finalizedSlot === undefined){
const err44 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/ammRoleWithdrawalQueue/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data8.finalizedAt === undefined){
const err45 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/ammRoleWithdrawalQueue/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
for(const key4 in data8){
if(!((((((key4 === "role") || (key4 === "address")) || (key4 === "ownerProgram")) || (key4 === "accountSha256")) || (key4 === "finalizedSlot")) || (key4 === "finalizedAt"))){
const err46 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/ammRoleWithdrawalQueue/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data8.role !== undefined){
if("withdrawal-queue" !== data8.role){
const err47 = {instancePath:instancePath+"/" + i4+"/role",schemaPath:"#/$defs/ammRoleWithdrawalQueue/properties/role/const",keyword:"const",params:{allowedValue: "withdrawal-queue"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
}
else {
const err48 = {instancePath:instancePath+"/" + i4,schemaPath:"#/$defs/ammRoleWithdrawalQueue/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
var _valid4 = _errs31 === errors;
if(_valid4){
count4++;
if(count4 > 1){
valid13 = false;
break;
}
valid13 = true;
}
}
if(!valid13){
const err49 = {instancePath,schemaPath:"#/allOf/4/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
else {
errors = _errs30;
if(vErrors !== null){
if(_errs30){
vErrors.length = _errs30;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
const _errs37 = errors;
const len5 = data.length;
let valid16 = false;
let count5 = 0;
for(let i5=0; i5<len5; i5++){
let data10 = data[i5];
const _errs38 = errors;
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
if(data10.role === undefined){
const err50 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/ammRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "role"},message:"must have required property '"+"role"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
if(data10.address === undefined){
const err51 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/ammRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "address"},message:"must have required property '"+"address"+"'"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(data10.ownerProgram === undefined){
const err52 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/ammRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "ownerProgram"},message:"must have required property '"+"ownerProgram"+"'"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
if(data10.accountSha256 === undefined){
const err53 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/ammRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "accountSha256"},message:"must have required property '"+"accountSha256"+"'"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
if(data10.finalizedSlot === undefined){
const err54 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/ammRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "finalizedSlot"},message:"must have required property '"+"finalizedSlot"+"'"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
if(data10.finalizedAt === undefined){
const err55 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/ammRoleFeeRightAccount/required",keyword:"required",params:{missingProperty: "finalizedAt"},message:"must have required property '"+"finalizedAt"+"'"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
for(const key5 in data10){
if(!((((((key5 === "role") || (key5 === "address")) || (key5 === "ownerProgram")) || (key5 === "accountSha256")) || (key5 === "finalizedSlot")) || (key5 === "finalizedAt"))){
const err56 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/ammRoleFeeRightAccount/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
if(data10.role !== undefined){
if("fee-right-account" !== data10.role){
const err57 = {instancePath:instancePath+"/" + i5+"/role",schemaPath:"#/$defs/ammRoleFeeRightAccount/properties/role/const",keyword:"const",params:{allowedValue: "fee-right-account"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
}
else {
const err58 = {instancePath:instancePath+"/" + i5,schemaPath:"#/$defs/ammRoleFeeRightAccount/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
var _valid5 = _errs38 === errors;
if(_valid5){
count5++;
if(count5 > 1){
valid16 = false;
break;
}
valid16 = true;
}
}
if(!valid16){
const err59 = {instancePath,schemaPath:"#/allOf/5/contains",keyword:"contains",params:{minContains: 1, maxContains: 1},message:"must contain at least 1 and no more than 1 valid item(s)"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
else {
errors = _errs37;
if(vErrors !== null){
if(_errs37){
vErrors.length = _errs37;
}
else {
vErrors = null;
}
}
}
}
if(Array.isArray(data)){
if(data.length > 6){
const err60 = {instancePath,schemaPath:"#/maxItems",keyword:"maxItems",params:{limit: 6},message:"must NOT have more than 6 items"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
if(data.length < 6){
const err61 = {instancePath,schemaPath:"#/minItems",keyword:"minItems",params:{limit: 6},message:"must NOT have fewer than 6 items"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
const len6 = data.length;
for(let i6=0; i6<len6; i6++){
if(!(validate87(data[i6], {instancePath:instancePath+"/" + i6,parentData:data,parentDataProperty:i6,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate87.errors : vErrors.concat(validate87.errors);
errors = vErrors.length;
}
}
}
else {
const err62 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
validate86.errors = vErrors;
return errors === 0;
}
validate86.evaluated = {"items":true,"dynamicProps":false,"dynamicItems":false};


function validate81(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate81.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err0 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.lpMint === undefined){
const err1 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "lpMint"},message:"must have required property '"+"lpMint"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.lockedPosition === undefined){
const err2 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "lockedPosition"},message:"must have required property '"+"lockedPosition"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.lockProgram === undefined){
const err3 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "lockProgram"},message:"must have required property '"+"lockProgram"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.lockNftMint === undefined){
const err4 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "lockNftMint"},message:"must have required property '"+"lockNftMint"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.lockNftTokenAccount === undefined){
const err5 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "lockNftTokenAccount"},message:"must have required property '"+"lockNftTokenAccount"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.lockVault === undefined){
const err6 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "lockVault"},message:"must have required property '"+"lockVault"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.platformLpBps === undefined){
const err7 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "platformLpBps"},message:"must have required property '"+"platformLpBps"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.creatorLpBps === undefined){
const err8 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "creatorLpBps"},message:"must have required property '"+"creatorLpBps"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.irreversibleLpBps === undefined){
const err9 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "irreversibleLpBps"},message:"must have required property '"+"irreversibleLpBps"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.withdrawalAuthority === undefined){
const err10 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "withdrawalAuthority"},message:"must have required property '"+"withdrawalAuthority"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data.feeKey === undefined){
const err11 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "feeKey"},message:"must have required property '"+"feeKey"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.feeRights === undefined){
const err12 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "feeRights"},message:"must have required property '"+"feeRights"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.recoverableLpBaseUnits === undefined){
const err13 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "recoverableLpBaseUnits"},message:"must have required property '"+"recoverableLpBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data.evidenceAccounts === undefined){
const err14 = {instancePath,schemaPath:"#/oneOf/0/required",keyword:"required",params:{missingProperty: "evidenceAccounts"},message:"must have required property '"+"evidenceAccounts"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema133.oneOf[0].properties, key0))){
const err15 = {instancePath,schemaPath:"#/oneOf/0/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.kind !== undefined){
if("burn-and-earn" !== data.kind){
const err16 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/0/properties/kind/const",keyword:"const",params:{allowedValue: "burn-and-earn"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.lpMint !== undefined){
let data1 = data.lpMint;
if(typeof data1 === "string"){
if(!pattern4.test(data1)){
const err17 = {instancePath:instancePath+"/lpMint",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
else {
const err18 = {instancePath:instancePath+"/lpMint",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.lockedPosition !== undefined){
let data2 = data.lockedPosition;
if(typeof data2 === "string"){
if(!pattern4.test(data2)){
const err19 = {instancePath:instancePath+"/lockedPosition",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
else {
const err20 = {instancePath:instancePath+"/lockedPosition",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.lockProgram !== undefined){
if("LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE" !== data.lockProgram){
const err21 = {instancePath:instancePath+"/lockProgram",schemaPath:"#/oneOf/0/properties/lockProgram/const",keyword:"const",params:{allowedValue: "LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.lockNftMint !== undefined){
let data4 = data.lockNftMint;
if(typeof data4 === "string"){
if(!pattern4.test(data4)){
const err22 = {instancePath:instancePath+"/lockNftMint",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
else {
const err23 = {instancePath:instancePath+"/lockNftMint",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data.lockNftTokenAccount !== undefined){
let data5 = data.lockNftTokenAccount;
if(typeof data5 === "string"){
if(!pattern4.test(data5)){
const err24 = {instancePath:instancePath+"/lockNftTokenAccount",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
else {
const err25 = {instancePath:instancePath+"/lockNftTokenAccount",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data.lockVault !== undefined){
let data6 = data.lockVault;
if(typeof data6 === "string"){
if(!pattern4.test(data6)){
const err26 = {instancePath:instancePath+"/lockVault",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
else {
const err27 = {instancePath:instancePath+"/lockVault",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data.platformLpBps !== undefined){
if(0 !== data.platformLpBps){
const err28 = {instancePath:instancePath+"/platformLpBps",schemaPath:"#/oneOf/0/properties/platformLpBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data.creatorLpBps !== undefined){
if(0 !== data.creatorLpBps){
const err29 = {instancePath:instancePath+"/creatorLpBps",schemaPath:"#/oneOf/0/properties/creatorLpBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data.irreversibleLpBps !== undefined){
if(10000 !== data.irreversibleLpBps){
const err30 = {instancePath:instancePath+"/irreversibleLpBps",schemaPath:"#/oneOf/0/properties/irreversibleLpBps/const",keyword:"const",params:{allowedValue: 10000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data.withdrawalAuthority !== undefined){
if(data.withdrawalAuthority !== null){
const err31 = {instancePath:instancePath+"/withdrawalAuthority",schemaPath:"#/oneOf/0/properties/withdrawalAuthority/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data.feeKey !== undefined){
if(data.feeKey !== null){
const err32 = {instancePath:instancePath+"/feeKey",schemaPath:"#/oneOf/0/properties/feeKey/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data.feeRights !== undefined){
let data12 = data.feeRights;
if(Array.isArray(data12)){
if(data12.length > 0){
const err33 = {instancePath:instancePath+"/feeRights",schemaPath:"#/oneOf/0/properties/feeRights/maxItems",keyword:"maxItems",params:{limit: 0},message:"must NOT have more than 0 items"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
else {
const err34 = {instancePath:instancePath+"/feeRights",schemaPath:"#/oneOf/0/properties/feeRights/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.recoverableLpBaseUnits !== undefined){
if("0" !== data.recoverableLpBaseUnits){
const err35 = {instancePath:instancePath+"/recoverableLpBaseUnits",schemaPath:"#/oneOf/0/properties/recoverableLpBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data.evidenceAccounts !== undefined){
if(!(validate82(data.evidenceAccounts, {instancePath:instancePath+"/evidenceAccounts",parentData:data,parentDataProperty:"evidenceAccounts",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate82.errors : vErrors.concat(validate82.errors);
errors = vErrors.length;
}
}
}
else {
const err36 = {instancePath,schemaPath:"#/oneOf/0/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs32 = errors;
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.kind === undefined){
const err37 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
if(data.lpMint === undefined){
const err38 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "lpMint"},message:"must have required property '"+"lpMint"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data.burnedBaseUnits === undefined){
const err39 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "burnedBaseUnits"},message:"must have required property '"+"burnedBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data.totalSupplyBaseUnits === undefined){
const err40 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "totalSupplyBaseUnits"},message:"must have required property '"+"totalSupplyBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data.creatorLpBaseUnits === undefined){
const err41 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "creatorLpBaseUnits"},message:"must have required property '"+"creatorLpBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data.platformLpBaseUnits === undefined){
const err42 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "platformLpBaseUnits"},message:"must have required property '"+"platformLpBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data.recoverableLpBaseUnits === undefined){
const err43 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "recoverableLpBaseUnits"},message:"must have required property '"+"recoverableLpBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data.withdrawalAuthority === undefined){
const err44 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "withdrawalAuthority"},message:"must have required property '"+"withdrawalAuthority"+"'"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data.feeKey === undefined){
const err45 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "feeKey"},message:"must have required property '"+"feeKey"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(data.feeRights === undefined){
const err46 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "feeRights"},message:"must have required property '"+"feeRights"+"'"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
if(data.evidenceAccounts === undefined){
const err47 = {instancePath,schemaPath:"#/oneOf/1/required",keyword:"required",params:{missingProperty: "evidenceAccounts"},message:"must have required property '"+"evidenceAccounts"+"'"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
for(const key1 in data){
if(!(func1.call(schema133.oneOf[1].properties, key1))){
const err48 = {instancePath,schemaPath:"#/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data.kind !== undefined){
if("lp-burn" !== data.kind){
const err49 = {instancePath:instancePath+"/kind",schemaPath:"#/oneOf/1/properties/kind/const",keyword:"const",params:{allowedValue: "lp-burn"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data.lpMint !== undefined){
let data16 = data.lpMint;
if(typeof data16 === "string"){
if(!pattern4.test(data16)){
const err50 = {instancePath:instancePath+"/lpMint",schemaPath:"#/$defs/publicKey/pattern",keyword:"pattern",params:{pattern: "^[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
else {
const err51 = {instancePath:instancePath+"/lpMint",schemaPath:"#/$defs/publicKey/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
if(data.burnedBaseUnits !== undefined){
let data17 = data.burnedBaseUnits;
if(typeof data17 === "string"){
if(!pattern14.test(data17)){
const err52 = {instancePath:instancePath+"/burnedBaseUnits",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
else {
const err53 = {instancePath:instancePath+"/burnedBaseUnits",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data.totalSupplyBaseUnits !== undefined){
let data18 = data.totalSupplyBaseUnits;
if(typeof data18 === "string"){
if(!pattern14.test(data18)){
const err54 = {instancePath:instancePath+"/totalSupplyBaseUnits",schemaPath:"#/$defs/unsignedDecimal/pattern",keyword:"pattern",params:{pattern: "^(0|[1-9][0-9]*)$"},message:"must match pattern \""+"^(0|[1-9][0-9]*)$"+"\""};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
else {
const err55 = {instancePath:instancePath+"/totalSupplyBaseUnits",schemaPath:"#/$defs/unsignedDecimal/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data.creatorLpBaseUnits !== undefined){
if("0" !== data.creatorLpBaseUnits){
const err56 = {instancePath:instancePath+"/creatorLpBaseUnits",schemaPath:"#/oneOf/1/properties/creatorLpBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
if(data.platformLpBaseUnits !== undefined){
if("0" !== data.platformLpBaseUnits){
const err57 = {instancePath:instancePath+"/platformLpBaseUnits",schemaPath:"#/oneOf/1/properties/platformLpBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
if(data.recoverableLpBaseUnits !== undefined){
if("0" !== data.recoverableLpBaseUnits){
const err58 = {instancePath:instancePath+"/recoverableLpBaseUnits",schemaPath:"#/oneOf/1/properties/recoverableLpBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data.withdrawalAuthority !== undefined){
if(data.withdrawalAuthority !== null){
const err59 = {instancePath:instancePath+"/withdrawalAuthority",schemaPath:"#/oneOf/1/properties/withdrawalAuthority/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data.feeKey !== undefined){
if(data.feeKey !== null){
const err60 = {instancePath:instancePath+"/feeKey",schemaPath:"#/oneOf/1/properties/feeKey/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
if(data.feeRights !== undefined){
let data24 = data.feeRights;
if(Array.isArray(data24)){
if(data24.length > 0){
const err61 = {instancePath:instancePath+"/feeRights",schemaPath:"#/oneOf/1/properties/feeRights/maxItems",keyword:"maxItems",params:{limit: 0},message:"must NOT have more than 0 items"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
else {
const err62 = {instancePath:instancePath+"/feeRights",schemaPath:"#/oneOf/1/properties/feeRights/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
if(data.evidenceAccounts !== undefined){
if(!(validate86(data.evidenceAccounts, {instancePath:instancePath+"/evidenceAccounts",parentData:data,parentDataProperty:"evidenceAccounts",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate86.errors : vErrors.concat(validate86.errors);
errors = vErrors.length;
}
}
}
else {
const err63 = {instancePath,schemaPath:"#/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
var _valid0 = _errs32 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
}
if(!valid0){
const err64 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate81.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate81.evaluated = {"dynamicProps":true,"dynamicItems":false};

const pattern48 = new RegExp("^https://raydium\\.io/liquidity-pools/[1-9A-HJ-NP-Za-km-z]{32,44}$", "u");

function validate59(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate59.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.stage === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "stage"},message:"must have required property '"+"stage"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.availability === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "availability"},message:"must have required property '"+"availability"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.sourceArtifacts === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "sourceArtifacts"},message:"must have required property '"+"sourceArtifacts"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.observation === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "observation"},message:"must have required property '"+"observation"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.supply === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "supply"},message:"must have required property '"+"supply"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.authorities === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "authorities"},message:"must have required property '"+"authorities"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.creatorBalance === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creatorBalance"},message:"must have required property '"+"creatorBalance"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.allocations === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "allocations"},message:"must have required property '"+"allocations"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.quote === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "quote"},message:"must have required property '"+"quote"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.creatorFirstBuy === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "creatorFirstBuy"},message:"must have required property '"+"creatorFirstBuy"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.vesting === undefined){
const err10 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "vesting"},message:"must have required property '"+"vesting"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data.fees === undefined){
const err11 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "fees"},message:"must have required property '"+"fees"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.cost === undefined){
const err12 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "cost"},message:"must have required property '"+"cost"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.metadata === undefined){
const err13 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "metadata"},message:"must have required property '"+"metadata"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data.transactions === undefined){
const err14 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "transactions"},message:"must have required property '"+"transactions"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data.links === undefined){
const err15 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "links"},message:"must have required property '"+"links"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data.graduation === undefined){
const err16 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "graduation"},message:"must have required property '"+"graduation"+"'"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(data.pool === undefined){
const err17 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "pool"},message:"must have required property '"+"pool"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data.lpDisposition === undefined){
const err18 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "lpDisposition"},message:"must have required property '"+"lpDisposition"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema106.properties, key0))){
const err19 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data.stage !== undefined){
if("graduated" !== data.stage){
const err20 = {instancePath:instancePath+"/stage",schemaPath:"#/properties/stage/const",keyword:"const",params:{allowedValue: "graduated"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.availability !== undefined){
if("verified" !== data.availability){
const err21 = {instancePath:instancePath+"/availability",schemaPath:"#/properties/availability/const",keyword:"const",params:{allowedValue: "verified"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data.sourceArtifacts !== undefined){
if(!(validate60(data.sourceArtifacts, {instancePath:instancePath+"/sourceArtifacts",parentData:data,parentDataProperty:"sourceArtifacts",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate60.errors : vErrors.concat(validate60.errors);
errors = vErrors.length;
}
}
if(data.observation !== undefined){
if(!(validate35(data.observation, {instancePath:instancePath+"/observation",parentData:data,parentDataProperty:"observation",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate35.errors : vErrors.concat(validate35.errors);
errors = vErrors.length;
}
}
if(data.supply !== undefined){
let data4 = data.supply;
if(data4 && typeof data4 == "object" && !Array.isArray(data4)){
if(data4.baseUnits === undefined){
const err22 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/required",keyword:"required",params:{missingProperty: "baseUnits"},message:"must have required property '"+"baseUnits"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data4.uiAmount === undefined){
const err23 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/required",keyword:"required",params:{missingProperty: "uiAmount"},message:"must have required property '"+"uiAmount"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data4.decimals === undefined){
const err24 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/required",keyword:"required",params:{missingProperty: "decimals"},message:"must have required property '"+"decimals"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data4.tokenProgram === undefined){
const err25 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/required",keyword:"required",params:{missingProperty: "tokenProgram"},message:"must have required property '"+"tokenProgram"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
for(const key1 in data4){
if(!((((key1 === "baseUnits") || (key1 === "uiAmount")) || (key1 === "decimals")) || (key1 === "tokenProgram"))){
const err26 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data4.baseUnits !== undefined){
if("1000000000000" !== data4.baseUnits){
const err27 = {instancePath:instancePath+"/supply/baseUnits",schemaPath:"#/$defs/supply/properties/baseUnits/const",keyword:"const",params:{allowedValue: "1000000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data4.uiAmount !== undefined){
if("1000000" !== data4.uiAmount){
const err28 = {instancePath:instancePath+"/supply/uiAmount",schemaPath:"#/$defs/supply/properties/uiAmount/const",keyword:"const",params:{allowedValue: "1000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data4.decimals !== undefined){
if(6 !== data4.decimals){
const err29 = {instancePath:instancePath+"/supply/decimals",schemaPath:"#/$defs/supply/properties/decimals/const",keyword:"const",params:{allowedValue: 6},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data4.tokenProgram !== undefined){
if("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" !== data4.tokenProgram){
const err30 = {instancePath:instancePath+"/supply/tokenProgram",schemaPath:"#/$defs/supply/properties/tokenProgram/const",keyword:"const",params:{allowedValue: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
else {
const err31 = {instancePath:instancePath+"/supply",schemaPath:"#/$defs/supply/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data.authorities !== undefined){
let data9 = data.authorities;
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.mintAuthority === undefined){
const err32 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/graduatedAuthorities/required",keyword:"required",params:{missingProperty: "mintAuthority"},message:"must have required property '"+"mintAuthority"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data9.authorityKind === undefined){
const err33 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/graduatedAuthorities/required",keyword:"required",params:{missingProperty: "authorityKind"},message:"must have required property '"+"authorityKind"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data9.freezeAuthority === undefined){
const err34 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/graduatedAuthorities/required",keyword:"required",params:{missingProperty: "freezeAuthority"},message:"must have required property '"+"freezeAuthority"+"'"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
for(const key2 in data9){
if(!(((key2 === "mintAuthority") || (key2 === "authorityKind")) || (key2 === "freezeAuthority"))){
const err35 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/graduatedAuthorities/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data9.mintAuthority !== undefined){
if(data9.mintAuthority !== null){
const err36 = {instancePath:instancePath+"/authorities/mintAuthority",schemaPath:"#/$defs/graduatedAuthorities/properties/mintAuthority/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data9.authorityKind !== undefined){
if(data9.authorityKind !== null){
const err37 = {instancePath:instancePath+"/authorities/authorityKind",schemaPath:"#/$defs/graduatedAuthorities/properties/authorityKind/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data9.freezeAuthority !== undefined){
if(data9.freezeAuthority !== null){
const err38 = {instancePath:instancePath+"/authorities/freezeAuthority",schemaPath:"#/$defs/graduatedAuthorities/properties/freezeAuthority/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
}
else {
const err39 = {instancePath:instancePath+"/authorities",schemaPath:"#/$defs/graduatedAuthorities/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
if(data.creatorBalance !== undefined){
if(!(validate37(data.creatorBalance, {instancePath:instancePath+"/creatorBalance",parentData:data,parentDataProperty:"creatorBalance",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate37.errors : vErrors.concat(validate37.errors);
errors = vErrors.length;
}
}
if(data.allocations !== undefined){
let data14 = data.allocations;
if(data14 && typeof data14 == "object" && !Array.isArray(data14)){
if(data14.publicCurveBaseUnits === undefined){
const err40 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "publicCurveBaseUnits"},message:"must have required property '"+"publicCurveBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data14.publicCurveBps === undefined){
const err41 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "publicCurveBps"},message:"must have required property '"+"publicCurveBps"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data14.liquidityBaseUnits === undefined){
const err42 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "liquidityBaseUnits"},message:"must have required property '"+"liquidityBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data14.liquidityBps === undefined){
const err43 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "liquidityBps"},message:"must have required property '"+"liquidityBps"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data14.teamBaseUnits === undefined){
const err44 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "teamBaseUnits"},message:"must have required property '"+"teamBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data14.teamBps === undefined){
const err45 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "teamBps"},message:"must have required property '"+"teamBps"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(data14.totalBps === undefined){
const err46 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/required",keyword:"required",params:{missingProperty: "totalBps"},message:"must have required property '"+"totalBps"+"'"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
for(const key3 in data14){
if(!(((((((key3 === "publicCurveBaseUnits") || (key3 === "publicCurveBps")) || (key3 === "liquidityBaseUnits")) || (key3 === "liquidityBps")) || (key3 === "teamBaseUnits")) || (key3 === "teamBps")) || (key3 === "totalBps"))){
const err47 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data14.publicCurveBaseUnits !== undefined){
if("800000000000" !== data14.publicCurveBaseUnits){
const err48 = {instancePath:instancePath+"/allocations/publicCurveBaseUnits",schemaPath:"#/$defs/allocations/properties/publicCurveBaseUnits/const",keyword:"const",params:{allowedValue: "800000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data14.publicCurveBps !== undefined){
if(8000 !== data14.publicCurveBps){
const err49 = {instancePath:instancePath+"/allocations/publicCurveBps",schemaPath:"#/$defs/allocations/properties/publicCurveBps/const",keyword:"const",params:{allowedValue: 8000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data14.liquidityBaseUnits !== undefined){
if("200000000000" !== data14.liquidityBaseUnits){
const err50 = {instancePath:instancePath+"/allocations/liquidityBaseUnits",schemaPath:"#/$defs/allocations/properties/liquidityBaseUnits/const",keyword:"const",params:{allowedValue: "200000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data14.liquidityBps !== undefined){
if(2000 !== data14.liquidityBps){
const err51 = {instancePath:instancePath+"/allocations/liquidityBps",schemaPath:"#/$defs/allocations/properties/liquidityBps/const",keyword:"const",params:{allowedValue: 2000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
if(data14.teamBaseUnits !== undefined){
if("0" !== data14.teamBaseUnits){
const err52 = {instancePath:instancePath+"/allocations/teamBaseUnits",schemaPath:"#/$defs/allocations/properties/teamBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data14.teamBps !== undefined){
if(0 !== data14.teamBps){
const err53 = {instancePath:instancePath+"/allocations/teamBps",schemaPath:"#/$defs/allocations/properties/teamBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data14.totalBps !== undefined){
if(10000 !== data14.totalBps){
const err54 = {instancePath:instancePath+"/allocations/totalBps",schemaPath:"#/$defs/allocations/properties/totalBps/const",keyword:"const",params:{allowedValue: 10000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
}
else {
const err55 = {instancePath:instancePath+"/allocations",schemaPath:"#/$defs/allocations/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data.quote !== undefined){
if(!(validate41(data.quote, {instancePath:instancePath+"/quote",parentData:data,parentDataProperty:"quote",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate41.errors : vErrors.concat(validate41.errors);
errors = vErrors.length;
}
}
if(data.creatorFirstBuy !== undefined){
let data23 = data.creatorFirstBuy;
if(data23 && typeof data23 == "object" && !Array.isArray(data23)){
if(data23.creatorLamports === undefined){
const err56 = {instancePath:instancePath+"/creatorFirstBuy",schemaPath:"#/$defs/creatorFirstBuy/required",keyword:"required",params:{missingProperty: "creatorLamports"},message:"must have required property '"+"creatorLamports"+"'"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
if(data23.creatorTokenBaseUnits === undefined){
const err57 = {instancePath:instancePath+"/creatorFirstBuy",schemaPath:"#/$defs/creatorFirstBuy/required",keyword:"required",params:{missingProperty: "creatorTokenBaseUnits"},message:"must have required property '"+"creatorTokenBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
for(const key4 in data23){
if(!((key4 === "creatorLamports") || (key4 === "creatorTokenBaseUnits"))){
const err58 = {instancePath:instancePath+"/creatorFirstBuy",schemaPath:"#/$defs/creatorFirstBuy/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data23.creatorLamports !== undefined){
if("0" !== data23.creatorLamports){
const err59 = {instancePath:instancePath+"/creatorFirstBuy/creatorLamports",schemaPath:"#/$defs/creatorFirstBuy/properties/creatorLamports/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data23.creatorTokenBaseUnits !== undefined){
if("0" !== data23.creatorTokenBaseUnits){
const err60 = {instancePath:instancePath+"/creatorFirstBuy/creatorTokenBaseUnits",schemaPath:"#/$defs/creatorFirstBuy/properties/creatorTokenBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
}
else {
const err61 = {instancePath:instancePath+"/creatorFirstBuy",schemaPath:"#/$defs/creatorFirstBuy/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
if(data.vesting !== undefined){
let data26 = data.vesting;
if(data26 && typeof data26 == "object" && !Array.isArray(data26)){
if(data26.lockedBaseUnits === undefined){
const err62 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/required",keyword:"required",params:{missingProperty: "lockedBaseUnits"},message:"must have required property '"+"lockedBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
if(data26.cliffSeconds === undefined){
const err63 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/required",keyword:"required",params:{missingProperty: "cliffSeconds"},message:"must have required property '"+"cliffSeconds"+"'"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
if(data26.unlockSeconds === undefined){
const err64 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/required",keyword:"required",params:{missingProperty: "unlockSeconds"},message:"must have required property '"+"unlockSeconds"+"'"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
for(const key5 in data26){
if(!(((key5 === "lockedBaseUnits") || (key5 === "cliffSeconds")) || (key5 === "unlockSeconds"))){
const err65 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
if(data26.lockedBaseUnits !== undefined){
if("0" !== data26.lockedBaseUnits){
const err66 = {instancePath:instancePath+"/vesting/lockedBaseUnits",schemaPath:"#/$defs/vesting/properties/lockedBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
if(data26.cliffSeconds !== undefined){
if("0" !== data26.cliffSeconds){
const err67 = {instancePath:instancePath+"/vesting/cliffSeconds",schemaPath:"#/$defs/vesting/properties/cliffSeconds/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
}
if(data26.unlockSeconds !== undefined){
if("0" !== data26.unlockSeconds){
const err68 = {instancePath:instancePath+"/vesting/unlockSeconds",schemaPath:"#/$defs/vesting/properties/unlockSeconds/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
}
else {
const err69 = {instancePath:instancePath+"/vesting",schemaPath:"#/$defs/vesting/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
if(data.fees !== undefined){
if(!(validate43(data.fees, {instancePath:instancePath+"/fees",parentData:data,parentDataProperty:"fees",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate43.errors : vErrors.concat(validate43.errors);
errors = vErrors.length;
}
}
if(data.cost !== undefined){
if(!(validate70(data.cost, {instancePath:instancePath+"/cost",parentData:data,parentDataProperty:"cost",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate70.errors : vErrors.concat(validate70.errors);
errors = vErrors.length;
}
}
if(data.metadata !== undefined){
if(!(validate47(data.metadata, {instancePath:instancePath+"/metadata",parentData:data,parentDataProperty:"metadata",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate47.errors : vErrors.concat(validate47.errors);
errors = vErrors.length;
}
}
if(data.transactions !== undefined){
if(!(validate73(data.transactions, {instancePath:instancePath+"/transactions",parentData:data,parentDataProperty:"transactions",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate73.errors : vErrors.concat(validate73.errors);
errors = vErrors.length;
}
}
if(data.links !== undefined){
let data34 = data.links;
if(data34 && typeof data34 == "object" && !Array.isArray(data34)){
if(data34.solscanMint === undefined){
const err70 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/graduatedLinks/required",keyword:"required",params:{missingProperty: "solscanMint"},message:"must have required property '"+"solscanMint"+"'"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
if(data34.solscanCreationTransaction === undefined){
const err71 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/graduatedLinks/required",keyword:"required",params:{missingProperty: "solscanCreationTransaction"},message:"must have required property '"+"solscanCreationTransaction"+"'"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
if(data34.solscanGraduationTransaction === undefined){
const err72 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/graduatedLinks/required",keyword:"required",params:{missingProperty: "solscanGraduationTransaction"},message:"must have required property '"+"solscanGraduationTransaction"+"'"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
if(data34.raydiumLaunchlab === undefined){
const err73 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/graduatedLinks/required",keyword:"required",params:{missingProperty: "raydiumLaunchlab"},message:"must have required property '"+"raydiumLaunchlab"+"'"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
if(data34.raydiumPool === undefined){
const err74 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/graduatedLinks/required",keyword:"required",params:{missingProperty: "raydiumPool"},message:"must have required property '"+"raydiumPool"+"'"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
for(const key6 in data34){
if(!(((((key6 === "solscanMint") || (key6 === "solscanCreationTransaction")) || (key6 === "solscanGraduationTransaction")) || (key6 === "raydiumLaunchlab")) || (key6 === "raydiumPool"))){
const err75 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/graduatedLinks/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
}
if(data34.solscanMint !== undefined){
let data35 = data34.solscanMint;
if(typeof data35 === "string"){
if(!pattern35.test(data35)){
const err76 = {instancePath:instancePath+"/links/solscanMint",schemaPath:"#/$defs/graduatedLinks/properties/solscanMint/pattern",keyword:"pattern",params:{pattern: "^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^https://solscan\\.io/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
}
else {
const err77 = {instancePath:instancePath+"/links/solscanMint",schemaPath:"#/$defs/graduatedLinks/properties/solscanMint/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
}
if(data34.solscanCreationTransaction !== undefined){
let data36 = data34.solscanCreationTransaction;
if(typeof data36 === "string"){
if(!pattern36.test(data36)){
const err78 = {instancePath:instancePath+"/links/solscanCreationTransaction",schemaPath:"#/$defs/graduatedLinks/properties/solscanCreationTransaction/pattern",keyword:"pattern",params:{pattern: "^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},message:"must match pattern \""+"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"+"\""};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
}
else {
const err79 = {instancePath:instancePath+"/links/solscanCreationTransaction",schemaPath:"#/$defs/graduatedLinks/properties/solscanCreationTransaction/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
}
if(data34.solscanGraduationTransaction !== undefined){
let data37 = data34.solscanGraduationTransaction;
if(typeof data37 === "string"){
if(!pattern36.test(data37)){
const err80 = {instancePath:instancePath+"/links/solscanGraduationTransaction",schemaPath:"#/$defs/graduatedLinks/properties/solscanGraduationTransaction/pattern",keyword:"pattern",params:{pattern: "^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"},message:"must match pattern \""+"^https://solscan\\.io/tx/[1-9A-HJ-NP-Za-km-z]{64,88}$"+"\""};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
else {
const err81 = {instancePath:instancePath+"/links/solscanGraduationTransaction",schemaPath:"#/$defs/graduatedLinks/properties/solscanGraduationTransaction/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
}
if(data34.raydiumLaunchlab !== undefined){
let data38 = data34.raydiumLaunchlab;
if(typeof data38 === "string"){
if(!pattern37.test(data38)){
const err82 = {instancePath:instancePath+"/links/raydiumLaunchlab",schemaPath:"#/$defs/graduatedLinks/properties/raydiumLaunchlab/pattern",keyword:"pattern",params:{pattern: "^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^https://raydium\\.io/launchpad/token/[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
}
else {
const err83 = {instancePath:instancePath+"/links/raydiumLaunchlab",schemaPath:"#/$defs/graduatedLinks/properties/raydiumLaunchlab/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
if(data34.raydiumPool !== undefined){
let data39 = data34.raydiumPool;
if(typeof data39 === "string"){
if(!pattern48.test(data39)){
const err84 = {instancePath:instancePath+"/links/raydiumPool",schemaPath:"#/$defs/graduatedLinks/properties/raydiumPool/pattern",keyword:"pattern",params:{pattern: "^https://raydium\\.io/liquidity-pools/[1-9A-HJ-NP-Za-km-z]{32,44}$"},message:"must match pattern \""+"^https://raydium\\.io/liquidity-pools/[1-9A-HJ-NP-Za-km-z]{32,44}$"+"\""};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
}
else {
const err85 = {instancePath:instancePath+"/links/raydiumPool",schemaPath:"#/$defs/graduatedLinks/properties/raydiumPool/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
}
else {
const err86 = {instancePath:instancePath+"/links",schemaPath:"#/$defs/graduatedLinks/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
}
if(data.graduation !== undefined){
if(!(validate77(data.graduation, {instancePath:instancePath+"/graduation",parentData:data,parentDataProperty:"graduation",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate77.errors : vErrors.concat(validate77.errors);
errors = vErrors.length;
}
}
if(data.pool !== undefined){
if(!(validate79(data.pool, {instancePath:instancePath+"/pool",parentData:data,parentDataProperty:"pool",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate79.errors : vErrors.concat(validate79.errors);
errors = vErrors.length;
}
}
if(data.lpDisposition !== undefined){
if(!(validate81(data.lpDisposition, {instancePath:instancePath+"/lpDisposition",parentData:data,parentDataProperty:"lpDisposition",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate81.errors : vErrors.concat(validate81.errors);
errors = vErrors.length;
}
}
}
else {
const err87 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
validate59.errors = vErrors;
return errors === 0;
}
validate59.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate57(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate57.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.status === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "status"},message:"must have required property '"+"status"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.network === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "network"},message:"must have required property '"+"network"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.project === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "project"},message:"must have required property '"+"project"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.token === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "token"},message:"must have required property '"+"token"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.launch === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "launch"},message:"must have required property '"+"launch"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.proof === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proof"},message:"must have required property '"+"proof"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "schemaVersion") || (key0 === "status")) || (key0 === "network")) || (key0 === "project")) || (key0 === "token")) || (key0 === "launch")) || (key0 === "proof"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(2 !== data.schemaVersion){
const err8 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 2},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.status !== undefined){
if("graduated" !== data.status){
const err9 = {instancePath:instancePath+"/status",schemaPath:"#/properties/status/const",keyword:"const",params:{allowedValue: "graduated"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.network !== undefined){
if("mainnet-beta" !== data.network){
const err10 = {instancePath:instancePath+"/network",schemaPath:"#/properties/network/const",keyword:"const",params:{allowedValue: "mainnet-beta"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.project !== undefined){
let data3 = data.project;
if(data3 && typeof data3 == "object" && !Array.isArray(data3)){
if(data3.name === undefined){
const err11 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data3.symbol === undefined){
const err12 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "symbol"},message:"must have required property '"+"symbol"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data3.agent === undefined){
const err13 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "agent"},message:"must have required property '"+"agent"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data3.website === undefined){
const err14 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "website"},message:"must have required property '"+"website"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data3.x === undefined){
const err15 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/required",keyword:"required",params:{missingProperty: "x"},message:"must have required property '"+"x"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
for(const key1 in data3){
if(!(((((key1 === "name") || (key1 === "symbol")) || (key1 === "agent")) || (key1 === "website")) || (key1 === "x"))){
const err16 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data3.name !== undefined){
if("Hakky Protocol" !== data3.name){
const err17 = {instancePath:instancePath+"/project/name",schemaPath:"#/$defs/project/properties/name/const",keyword:"const",params:{allowedValue: "Hakky Protocol"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data3.symbol !== undefined){
if("HAKKY" !== data3.symbol){
const err18 = {instancePath:instancePath+"/project/symbol",schemaPath:"#/$defs/project/properties/symbol/const",keyword:"const",params:{allowedValue: "HAKKY"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data3.agent !== undefined){
if("HakkyAgent" !== data3.agent){
const err19 = {instancePath:instancePath+"/project/agent",schemaPath:"#/$defs/project/properties/agent/const",keyword:"const",params:{allowedValue: "HakkyAgent"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data3.website !== undefined){
if("https://hakky.xyz" !== data3.website){
const err20 = {instancePath:instancePath+"/project/website",schemaPath:"#/$defs/project/properties/website/const",keyword:"const",params:{allowedValue: "https://hakky.xyz"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data3.x !== undefined){
if("https://x.com/antihakkysack" !== data3.x){
const err21 = {instancePath:instancePath+"/project/x",schemaPath:"#/$defs/project/properties/x/const",keyword:"const",params:{allowedValue: "https://x.com/antihakkysack"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
else {
const err22 = {instancePath:instancePath+"/project",schemaPath:"#/$defs/project/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.token !== undefined){
if(!(validate26(data.token, {instancePath:instancePath+"/token",parentData:data,parentDataProperty:"token",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate26.errors : vErrors.concat(validate26.errors);
errors = vErrors.length;
}
}
if(data.launch !== undefined){
let data10 = data.launch;
if(data10 && typeof data10 == "object" && !Array.isArray(data10)){
if(data10.venue === undefined){
const err23 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "venue"},message:"must have required property '"+"venue"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data10.quoteSymbol === undefined){
const err24 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "quoteSymbol"},message:"must have required property '"+"quoteSymbol"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data10.publicCurveBps === undefined){
const err25 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "publicCurveBps"},message:"must have required property '"+"publicCurveBps"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data10.liquidityBps === undefined){
const err26 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "liquidityBps"},message:"must have required property '"+"liquidityBps"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data10.teamBps === undefined){
const err27 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "teamBps"},message:"must have required property '"+"teamBps"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data10.creatorFirstBuyLamports === undefined){
const err28 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorFirstBuyLamports"},message:"must have required property '"+"creatorFirstBuyLamports"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data10.vestingBaseUnits === undefined){
const err29 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "vestingBaseUnits"},message:"must have required property '"+"vestingBaseUnits"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data10.creatorDebitCapLamports === undefined){
const err30 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/required",keyword:"required",params:{missingProperty: "creatorDebitCapLamports"},message:"must have required property '"+"creatorDebitCapLamports"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
for(const key2 in data10){
if(!((((((((key2 === "venue") || (key2 === "quoteSymbol")) || (key2 === "publicCurveBps")) || (key2 === "liquidityBps")) || (key2 === "teamBps")) || (key2 === "creatorFirstBuyLamports")) || (key2 === "vestingBaseUnits")) || (key2 === "creatorDebitCapLamports"))){
const err31 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data10.venue !== undefined){
if("Raydium LaunchLab" !== data10.venue){
const err32 = {instancePath:instancePath+"/launch/venue",schemaPath:"#/$defs/launch/properties/venue/const",keyword:"const",params:{allowedValue: "Raydium LaunchLab"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data10.quoteSymbol !== undefined){
if("SOL" !== data10.quoteSymbol){
const err33 = {instancePath:instancePath+"/launch/quoteSymbol",schemaPath:"#/$defs/launch/properties/quoteSymbol/const",keyword:"const",params:{allowedValue: "SOL"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
if(data10.publicCurveBps !== undefined){
if(8000 !== data10.publicCurveBps){
const err34 = {instancePath:instancePath+"/launch/publicCurveBps",schemaPath:"#/$defs/launch/properties/publicCurveBps/const",keyword:"const",params:{allowedValue: 8000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data10.liquidityBps !== undefined){
if(2000 !== data10.liquidityBps){
const err35 = {instancePath:instancePath+"/launch/liquidityBps",schemaPath:"#/$defs/launch/properties/liquidityBps/const",keyword:"const",params:{allowedValue: 2000},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data10.teamBps !== undefined){
if(0 !== data10.teamBps){
const err36 = {instancePath:instancePath+"/launch/teamBps",schemaPath:"#/$defs/launch/properties/teamBps/const",keyword:"const",params:{allowedValue: 0},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data10.creatorFirstBuyLamports !== undefined){
if("0" !== data10.creatorFirstBuyLamports){
const err37 = {instancePath:instancePath+"/launch/creatorFirstBuyLamports",schemaPath:"#/$defs/launch/properties/creatorFirstBuyLamports/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data10.vestingBaseUnits !== undefined){
if("0" !== data10.vestingBaseUnits){
const err38 = {instancePath:instancePath+"/launch/vestingBaseUnits",schemaPath:"#/$defs/launch/properties/vestingBaseUnits/const",keyword:"const",params:{allowedValue: "0"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data10.creatorDebitCapLamports !== undefined){
if("1000000000" !== data10.creatorDebitCapLamports){
const err39 = {instancePath:instancePath+"/launch/creatorDebitCapLamports",schemaPath:"#/$defs/launch/properties/creatorDebitCapLamports/const",keyword:"const",params:{allowedValue: "1000000000"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
}
else {
const err40 = {instancePath:instancePath+"/launch",schemaPath:"#/$defs/launch/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
if(data.proof !== undefined){
if(!(validate59(data.proof, {instancePath:instancePath+"/proof",parentData:data,parentDataProperty:"proof",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate59.errors : vErrors.concat(validate59.errors);
errors = vErrors.length;
}
}
}
else {
const err41 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
validate57.errors = vErrors;
return errors === 0;
}
validate57.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="https://hakky.xyz/schemas/web/launch-v2.schema.json" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate20.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
const _errs0 = errors;
let valid0 = false;
let passing0 = null;
const _errs1 = errors;
if(!(validate21(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
errors = vErrors.length;
}
var _valid0 = _errs1 === errors;
if(_valid0){
valid0 = true;
passing0 = 0;
var props0 = true;
}
const _errs2 = errors;
if(!(validate23(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
errors = vErrors.length;
}
var _valid0 = _errs2 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid0 = true;
passing0 = 1;
if(props0 !== true){
props0 = true;
}
}
const _errs3 = errors;
if(!(validate25(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
errors = vErrors.length;
}
var _valid0 = _errs3 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 2];
}
else {
if(_valid0){
valid0 = true;
passing0 = 2;
if(props0 !== true){
props0 = true;
}
}
const _errs4 = errors;
if(!(validate55(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate55.errors : vErrors.concat(validate55.errors);
errors = vErrors.length;
}
var _valid0 = _errs4 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 3];
}
else {
if(_valid0){
valid0 = true;
passing0 = 3;
if(props0 !== true){
props0 = true;
}
}
const _errs5 = errors;
if(!(validate57(data, {instancePath,parentData,parentDataProperty,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate57.errors : vErrors.concat(validate57.errors);
errors = vErrors.length;
}
var _valid0 = _errs5 === errors;
if(_valid0 && valid0){
valid0 = false;
passing0 = [passing0, 4];
}
else {
if(_valid0){
valid0 = true;
passing0 = 4;
if(props0 !== true){
props0 = true;
}
}
}
}
}
}
if(!valid0){
const err0 = {instancePath,schemaPath:"#/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
else {
errors = _errs0;
if(vErrors !== null){
if(_errs0){
vErrors.length = _errs0;
}
else {
vErrors = null;
}
}
}
validate20.errors = vErrors;
evaluated0.props = props0;
return errors === 0;
}
validate20.evaluated = {"dynamicProps":true,"dynamicItems":false};

export const validateLaunchShape = launchV2;
