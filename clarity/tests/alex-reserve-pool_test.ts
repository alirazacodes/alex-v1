import { assertEquals, describe, Tx, TxReceipt, types } from "./token-alex-src/deps.ts";
import { CoreClient } from "./token-alex-src/core-client.ts";
import { it } from "./token-alex-src/testutil.ts";

const ONE_8 = 1e8;

describe("[ALEX STAKING]", () => {

  //////////////////////////////////////////////////
  // REGISTRATION
  //////////////////////////////////////////////////

  describe("REGISTRATION", () => {
    describe("get-activation-block()", () => {
      it("throws ERR_CONTRACT_NOT_ACTIVATED if called before contract is activated", (chain, accounts, clients) => {
        // act
        const result = clients.core.getActivationBlock().result;

        // assert
        result
          .expectOk()
          .expectUint(CoreClient.ACTIVATION_BLOCKS);
      });
      it("succeeds and returns activation height", (chain, accounts, clients) => {
        // arrange
        const user = accounts.get("wallet_4")!;
        const deployer = accounts.get("deployer")!;
        const block = chain.mineBlock([
          clients.core.setActivationBlock(deployer, 1),
          clients.core.registerUser(user),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;

        // act
        const result = clients.core.getActivationBlock().result;

        // assert
        result.expectOk().expectUint(activationBlockHeight);
      });
    });
    describe("get-activation-delay()", () => {
      it("succeeds and returns activation delay", (chain, accounts, clients) => {
        // act
        const result = clients.core.getActivationDelay().result;
        // assert
        result.expectUint(CoreClient.ACTIVATION_DELAY);
      });
    });
    describe("get-activation-threshold()", () => {
      it("succeeds and returns activation threshold", (chain, accounts, clients) => {
        // act
        const result = clients.core.getActivationThreshold().result;
        // assert
        result.expectUint(CoreClient.ACTIVATION_THRESHOLD);
      });
    });
    describe("get-registered-users-nonce()", () => {
      it("succeeds and returns u0 if no users are registered", (chain, accounts, clients) => {
        // act
        const result = clients.core.getRegisteredUsersNonce().result;
        // assert
        result.expectUint(0);
      });
      it("succeeds and returns u1 if one user is registered", (chain, accounts, clients) => {
        // arrange
        const user = accounts.get("wallet_5")!;
        const receipt = chain.mineBlock([clients.core.registerUser(user)]).receipts[0];
        receipt.result.expectOk().expectBool(true);

        // act
        const result = clients.core.getRegisteredUsersNonce().result;
        // assert
        result.expectUint(1);
      });
    });
    describe("register-user()", () => {
      it("successfully register new user and emits print event with memo when supplied", (chain, accounts, clients) => {
        // arrange
        const user = accounts.get("wallet_5")!;
        const memo = "hello world";

        // act
        const receipt = chain.mineBlock([clients.core.registerUser(user, memo)])
          .receipts[0];

        // assert
        receipt.result.expectOk().expectBool(true);
        clients.core.getUserId(user).result.expectSome().expectUint(1);

        assertEquals(receipt.events.length, 1);

        const expectedEvent = {
          type: "contract_event",
          contract_event: {
            contract_identifier: clients.core.getContractAddress(),
            topic: "print",
            value: types.some(types.utf8(memo)),
          },
        };

        assertEquals(receipt.events[0], expectedEvent);
      });

      it("successfully register new user and do not emit any events when memo is not supplied", (chain, accounts, clients) => {
        // arrange
        const user = accounts.get("wallet_4")!;

        // act
        const receipt = chain.mineBlock([clients.core.registerUser(user)])
          .receipts[0];

        // assert
        receipt.result.expectOk().expectBool(true);
        clients.core.getUserId(user).result.expectSome().expectUint(1);

        assertEquals(receipt.events.length, 0);
      });

      it("throws ERR_USER_ALREADY_REGISTERED while trying to register user 2nd time", (chain, accounts, clients) => {
        // arrange
        const user = accounts.get("wallet_4")!;
        const registerUserTx = clients.core.registerUser(user);
        chain.mineBlock([registerUserTx]);

        // act
        const receipt = chain.mineBlock([registerUserTx]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_USER_ALREADY_REGISTERED);
      });

      it("throws ERR_ACTIVATION_THRESHOLD_REACHED error when user wants to register after reaching activation threshold", (chain, accounts, clients) => {
        // arrange
        const user1 = accounts.get("wallet_4")!;
        const user2 = accounts.get("wallet_5")!;
        const deployer = accounts.get("deployer")!;
        const block = chain.mineBlock([
          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(user1),
        ]);

        // act
        const receipt = chain.mineBlock([clients.core.registerUser(user2)])
          .receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_ACTIVATION_THRESHOLD_REACHED);
      });
    });
  });

  //////////////////////////////////////////////////
  // STAKING ACTIONS
  //////////////////////////////////////////////////

  describe("STAKING ACTIONS", () => {
    describe("stake-tokens()", () => {
      it("throws ERR_STAKING_NOT_AVAILABLE when staking is not available", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;            
        const amountTokens = 200 * ONE_8;
        const lockPeriod = 2;
        chain.mineBlock([clients.token.mint(amountTokens, staker, deployer)]);

        // act
        const receipt = chain.mineBlock([
          clients.core.stakeTokens(amountTokens, lockPeriod, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_STAKING_NOT_AVAILABLE);
      });

      it("throws ERR_CANNOT_STAKE while trying to stack with lock period = 0", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;
        const amountTokens = 200 * ONE_8;
        const lockPeriod = 0;
        const block = chain.mineBlock([
          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        const receipt = chain.mineBlock([
          clients.core.stakeTokens(amountTokens, lockPeriod, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_CANNOT_STAKE);
      });

      it("throws ERR_CANNOT_STAKE while trying to stack with lock period > 32", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;        
        const amountTokens = 200 * ONE_8;
        const lockPeriod = 33;
        const block = chain.mineBlock([

          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        const receipt = chain.mineBlock([
          clients.core.stakeTokens(amountTokens, lockPeriod, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_CANNOT_STAKE);
      });

      it("throws ERR_CANNOT_STAKE while trying to stack with amount tokens = 0", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;        
        const amountTokens = 0;
        const lockPeriod = 5;
        const block = chain.mineBlock([

          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        const receipt = chain.mineBlock([
          clients.core.stakeTokens(amountTokens, lockPeriod, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_CANNOT_STAKE);
      });

      it("throws ERR_TRANSFER_FAILED while trying to stack with amount tokens > user balance", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;        
        const amountTokens = 20 * ONE_8;
        const lockPeriod = 5;
        const block = chain.mineBlock([

          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        const receipt = chain.mineBlock([
          clients.core.stakeTokens(amountTokens + ONE_8, lockPeriod, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_TRANSFER_FAILED);
      });

      it("succeeds and cause one ft_transfer_event to core contract", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;            
        const amountTokens = 20 * ONE_8;
        const lockPeriod = 5;
        const block = chain.mineBlock([

          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        const receipt = chain.mineBlock([
          clients.core.stakeTokens(amountTokens, lockPeriod, staker),
        ]).receipts[0];

        // assert
        receipt.result.expectOk().expectBool(true);
                
        assertEquals(receipt.events.length, 2);
        receipt.events.expectFungibleTokenTransferEvent(
          amountTokens / ONE_8,
          staker.address,
          clients.core.getVaultAddress(),
          "alex"
        );
      });

      it("succeeds when called more than once", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;            
        const amountTokens = 20 * ONE_8;
        const lockPeriod = 5;
        const block = chain.mineBlock([

          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens * 3, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        const mineTokensTx = clients.core.stakeTokens(
          amountTokens,
          lockPeriod,
          staker
        );
        const receipts = chain.mineBlock([
          mineTokensTx,
          mineTokensTx,
          mineTokensTx,
        ]).receipts;

        // assert
        receipts.forEach((receipt: TxReceipt) => {
          receipt.result.expectOk().expectBool(true);
          assertEquals(receipt.events.length, 2);

          receipt.events.expectFungibleTokenTransferEvent(
            amountTokens / ONE_8,
            staker.address,
            clients.core.getVaultAddress(),
            "alex"
          );
        });
      });

      it("remembers when tokens should be returned when locking period = 1", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;            
        const amountTokens = 20 * ONE_8;
        const lockPeriod = 1;
        const block = chain.mineBlock([

          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        chain.mineBlock([
          clients.core.stakeTokens(amountTokens, lockPeriod, staker),
        ]);

        // assert
        const rewardCycle = 1;
        const userId = 1;
        const result = clients.core.getStakerAtCycleOrDefault(
          rewardCycle,
          userId
        ).result;

        assertEquals(result.expectTuple(), {
          'amount-staked': types.uint(amountTokens),
          'to-return': types.uint(amountTokens),
        });
      });

      it("remembers when tokens should be returned when locking period > 1", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;            
        const amountTokens = 20 * ONE_8;
        const lockPeriod = 8;
        const block = chain.mineBlock([

          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        chain.mineBlock([
          clients.core.stakeTokens(amountTokens, lockPeriod, staker),
        ]);

        // assert
        const userId = 1;

        for (let rewardCycle = 1; rewardCycle <= lockPeriod; rewardCycle++) {
          const result = clients.core.getStakerAtCycleOrDefault(
            rewardCycle,
            userId
          ).result;

          assertEquals(result.expectTuple(), {
            'amount-staked': types.uint(amountTokens),
            'to-return': types.uint(rewardCycle === lockPeriod ? amountTokens : 0),
          });
        }
      });

      it("remembers when tokens should be returned when staking multiple times with different locking periods", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;            
        const userId = 1;
        class StakingRecord {
          constructor(
            readonly stackInCycle: number,
            readonly lockPeriod: number,
            readonly amountTokens: number
          ) {}
        }

        const StakingRecords: StakingRecord[] = [
          new StakingRecord(1, 4, 20 * ONE_8),
          new StakingRecord(3, 8, 432 * ONE_8),
          new StakingRecord(7, 3, 10 * ONE_8),
          new StakingRecord(8, 2, 15 * ONE_8),
          new StakingRecord(9, 5, 123 * ONE_8),
        ];

        const totalAmountTokens = StakingRecords.reduce(
          (sum, record) => sum + record.amountTokens,
          0
        );
        const maxCycle = Math.max.apply(
          Math,
          StakingRecords.map((record) => {
            return record.stackInCycle + 1 + record.lockPeriod;
          })
        );

        const block = chain.mineBlock([
          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(totalAmountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        // act
        StakingRecords.forEach((record) => {
          // move chain tip to the beginning of specific cycle
          chain.mineEmptyBlockUntil(
            activationBlockHeight +
              record.stackInCycle * CoreClient.REWARD_CYCLE_LENGTH
          );

          chain.mineBlock([
            clients.core.stakeTokens(
              record.amountTokens,
              record.lockPeriod,
              staker
            ),
          ]);
        });

        // assert
        for (let rewardCycle = 0; rewardCycle <= maxCycle; rewardCycle++) {
          let expected = {
            'amount-staked': 0,
            'to-return': 0,
          };

          StakingRecords.forEach((record) => {
            let firstCycle = record.stackInCycle + 1;
            let lastCycle = record.stackInCycle + record.lockPeriod;

            if (rewardCycle >= firstCycle && rewardCycle <= lastCycle) {
              expected['amount-staked'] += record.amountTokens;
            }

            if (rewardCycle == lastCycle) {
              expected['to-return'] += record.amountTokens;
            }
          });

          const result = clients.core.getStakerAtCycleOrDefault(
            rewardCycle,
            userId
          ).result;

          console.table({
            cycle: rewardCycle,
            expected: expected,
            actual: result.expectTuple(),
          });
          
          assertEquals(result.expectTuple(), {
            'amount-staked': types.uint(expected['amount-staked']),
            'to-return': types.uint(expected['to-return']),
          });
        }
      });
    });
  });

  //////////////////////////////////////////////////
  // STAKING REWARD CLAIMS
  //////////////////////////////////////////////////

  describe("STAKING REWARD CLAIMS", () => {
    describe("claim-staking-reward()", () => {
      it("throws ERR_STAKING_NOT_AVAILABLE when staking is not yet available", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_1")!;
        const targetCycle = 1;

        // act
        const receipt = chain.mineBlock([
          clients.core.claimStakingReward(targetCycle, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_STAKING_NOT_AVAILABLE);
      });

      it("throws ERR_USER_ID_NOT_FOUND when called by unknown user", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_1")!;
        const otherUser = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;
        const targetCycle = 1;
        const setupBlock = chain.mineBlock([

          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(otherUser),
        ]);
        chain.mineEmptyBlockUntil(
          setupBlock.height + CoreClient.ACTIVATION_DELAY - 1
        );

        // act
        const receipt = chain.mineBlock([
          clients.core.claimStakingReward(targetCycle, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_USER_ID_NOT_FOUND);
      });

      it("throws ERR_REWARD_CYCLE_NOT_COMPLETED when reward cycle is not completed", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_1")!;
        const deployer = accounts.get("deployer")!;
        const targetCycle = 1;
        const setupBlock = chain.mineBlock([
          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
        ]);
        chain.mineEmptyBlockUntil(
          setupBlock.height + CoreClient.ACTIVATION_DELAY - 1
        );

        // act
        const receipt = chain.mineBlock([
          clients.core.claimStakingReward(targetCycle, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_REWARD_CYCLE_NOT_COMPLETED);
      });

      it("throws ERR_NOTHING_TO_REDEEM when staker didn't stack at all", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_1")!;
        const deployer = accounts.get("deployer")!;
        const targetCycle = 1;
        const setupBlock = chain.mineBlock([
          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
        ]);
        chain.mineEmptyBlockUntil(
          setupBlock.height +
            CoreClient.ACTIVATION_DELAY +
            CoreClient.REWARD_CYCLE_LENGTH * 2 -
            1
        );

        // act
        const receipt = chain.mineBlock([
          clients.core.claimStakingReward(targetCycle, staker),
        ]).receipts[0];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_NOTHING_TO_REDEEM);
      });

      it("throws ERR_NOTHING_TO_REDEEM while trying to claim reward 2nd time", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_1")!;
        const deployer = accounts.get("deployer")!;        
        const targetCycle = 1;
        const amount = 200 * ONE_8;
        const setupBlock = chain.mineBlock([
          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amount, staker, deployer),
        ]);

        chain.mineEmptyBlockUntil(
          setupBlock.height + CoreClient.ACTIVATION_DELAY + 1
        );
        let result = chain.mineBlock([clients.core.stakeTokens(amount, 1, staker)]).receipts;

        chain.mineEmptyBlock(CoreClient.REWARD_CYCLE_LENGTH * 2);

        // act
        const receipt = chain.mineBlock([
          clients.core.claimStakingReward(targetCycle, staker),
          clients.core.claimStakingReward(targetCycle, staker),
        ]).receipts[1];

        // assert
        receipt.result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_NOTHING_TO_REDEEM);
      });

      it("succeeds and cause ft_transfer events", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;        
        const targetCycle = 1;
        const amountTokens = 200 * ONE_8;
        const setupBlock = chain.mineBlock([
          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(amountTokens, staker, deployer),
        ]);
        chain.mineEmptyBlockUntil(
          setupBlock.height + CoreClient.ACTIVATION_DELAY + 1
        );
        chain.mineBlock([clients.core.stakeTokens(amountTokens, 1, staker)]);
        chain.mineEmptyBlock(CoreClient.REWARD_CYCLE_LENGTH * 2);

        // act
        const receipt = chain.mineBlock([
          clients.core.claimStakingReward(targetCycle, staker),
        ]).receipts[0];

        // assert
        receipt.result.expectOk().expectBool(true);
        assertEquals(receipt.events.length, 3);

        receipt.events.expectFungibleTokenTransferEvent(
          amountTokens / ONE_8,
          clients.core.getVaultAddress(),
          staker.address,
          "alex"
        );
      });

      it("succeeds and release tokens only for last cycle in locked period", (chain, accounts, clients) => {
        // arrange
        const staker = accounts.get("wallet_2")!;
        const deployer = accounts.get("deployer")!;        
        const userId = 1;
        class StakingRecord {
          constructor(
            readonly stackInCycle: number,
            readonly lockPeriod: number,
            readonly amountTokens: number
          ) {}
        }

        const StakingRecords: StakingRecord[] = [
          new StakingRecord(1, 4, 20 * ONE_8),
          new StakingRecord(3, 8, 432 * ONE_8),
          new StakingRecord(7, 3, 10 * ONE_8),
          new StakingRecord(8, 2, 15 * ONE_8),
          new StakingRecord(9, 5, 123 * ONE_8),
        ];

        const totalAmountTokens = StakingRecords.reduce(
          (sum, record) => sum + record.amountTokens,
          0
        );
        const maxCycle = Math.max.apply(
          Math,
          StakingRecords.map((record) => {
            return record.stackInCycle + 1 + record.lockPeriod;
          })
        );

        const block = chain.mineBlock([
          clients.core.setActivationThreshold(deployer, 1),
          clients.core.registerUser(staker),
          clients.token.mint(totalAmountTokens, staker, deployer),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;
        chain.mineEmptyBlockUntil(activationBlockHeight);

        StakingRecords.forEach((record) => {
          // move chain tip to the beginning of specific cycle
          chain.mineEmptyBlockUntil(
            activationBlockHeight +
              record.stackInCycle * CoreClient.REWARD_CYCLE_LENGTH
          );          

          chain.mineBlock([
            clients.core.stakeTokens(
              record.amountTokens,
              record.lockPeriod,
              staker
            ),
          ]);
        });

        chain.mineEmptyBlockUntil(
          CoreClient.REWARD_CYCLE_LENGTH * (maxCycle + 1)
        );

        // act + assert
        for (let rewardCycle = 0; rewardCycle <= maxCycle; rewardCycle++) {
          let toReturn = 0;
          let coinbaseAmount = parseFloat(clients.core.getCoinbaseAmount(rewardCycle).result.substr(1));
          let stakingReward = parseFloat(clients.core.getStakingReward(1, rewardCycle).result.substr(1)); 
          let entitledToken = coinbaseAmount * stakingReward / ONE_8;          

          StakingRecords.forEach((record) => {
            let lastCycle = record.stackInCycle + record.lockPeriod;

            if (rewardCycle == lastCycle) {
              toReturn += record.amountTokens;
            }
          });

          const receipt = chain.mineBlock([
            clients.core.claimStakingReward(rewardCycle, staker),
          ]).receipts[0];

          if (toReturn === 0 && entitledToken === 0) {
            receipt.result.expectErr();
          } else if (toReturn === 0) {
            // only mints entitled tokens
            receipt.result.expectOk().expectBool(true);
            assertEquals(receipt.events.length, 1);
          } else {        
            receipt.result.expectOk().expectBool(true);
            assertEquals(receipt.events.length, 3);

            receipt.events.expectFungibleTokenTransferEvent(
              toReturn / ONE_8,
              clients.core.getVaultAddress(),
              staker.address,
              "alex"
            );
          }
        }
      });
    });
  });
});