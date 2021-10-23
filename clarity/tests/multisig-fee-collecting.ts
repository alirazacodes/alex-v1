

// import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
// import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// import { 
//     YTPTestAgent1,
//   } from './models/alex-tests-yield-token-pool.ts';

// import { 
//     MS_YTP_WBT_79760,
// } from './models/alex-tests-multisigs.ts';

// import { 
//     USDAToken,
//     WBTCToken,
//     POOLTOKEN_YTP_WBTC_WBTC_59760
//   } from './models/alex-tests-tokens.ts';


// // Deployer Address Constants 
// const wbtcAddress = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.token-wbtc"
// const yieldwbtc79760Address = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.yield-wbtc-79760"
// const ytpyieldwbtc79760Address = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.ytp-yield-wbtc-79760-wbtc"
// const multisigytpyieldwbtc79760 = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.multisig-ytp-yield-wbtc-79760-wbtc"

// const ONE_8 = 100000000
// const expiry = 59760 * ONE_8

// Clarinet.test({
//     name: "YTP : Pool creation, adding values and reducing values",

//     async fn(chain: Chain, accounts: Map<string, Account>) {
//         let deployer = accounts.get("wallet_1")!;
//         let YTPTest = new YTPTestAgent1(chain, deployer);
        
//         //Deployer creating a pool, initial tokens injected to the pool
//         let result = YTPTest.createPool(deployer, yieldwbtc79760Address, wbtcAddress, ytpyieldwbtc79760Address, multisigytpyieldwbtc79760, 1000*ONE_8, 1000*ONE_8);
//         result.expectOk().expectBool(true);

//         // Check pool details and print
//         let call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
//         let position:any = call.result.expectOk().expectTuple();
//         position['balance-token'].expectUint(1000*ONE_8);
//         position['balance-aytoken'].expectUint(0);
//         position['balance-virtual'].expectUint(1000*ONE_8);

//         let listed = 100000000;

//         //Add extra liquidity
//         result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 10*ONE_8);
//         position = result.expectOk().expectTuple();
//         position['supply'].expectUint(10*ONE_8);
//         position['balance-token'].expectUint(10*ONE_8);
//         position['balance-aytoken'].expectUint(0);
//         position['balance-virtual'].expectUint(10*ONE_8);

//         // Check pool details and print
//         call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
//         position = call.result.expectOk().expectTuple();
//         position['total-supply'].expectUint(1010*ONE_8);
//         position['balance-token'].expectUint(1010*ONE_8);
//         position['balance-aytoken'].expectUint(0);
//         position['balance-virtual'].expectUint(1010*ONE_8);        

//         // Remove all liquidlity
//         result = YTPTest.reducePosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 1*ONE_8);
//         position =result.expectOk().expectTuple();
//         position['dx'].expectUint(1010*ONE_8);
//         position['dy'].expectUint(0);

//         // Add back some liquidity
//         result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 1000*ONE_8);
//         position = result.expectOk().expectTuple();
//         position['supply'].expectUint(1000*ONE_8);
//         position['balance-token'].expectUint(1000*ONE_8);
//         position['balance-aytoken'].expectUint(0);
//         position['balance-virtual'].expectUint(1000*ONE_8);     
        
//         // check t
//         call = chain.callReadOnlyFn("yield-token-pool", "get-t", 
//             [types.uint(expiry),
//              types.uint(listed)
//             ], deployer.address);
//         call.result.expectOk().expectUint(710557)
        
//         // zero actual yield-token, so must throw an error
//         call = await YTPTest.getYgivenX(yieldwbtc59760Address, 1*ONE_8);
//         call.result.expectErr().expectUint(2016)
        
//         // zero actual yield-token, so yield must be zero
//         call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         call.result.expectOk().expectUint(5)

//         // zero rate environment, so yield-token and token are at parity.
//         call = await YTPTest.getXgivenY(yieldwbtc59760Address, 2*ONE_8);
//         call.result.expectOk().expectUint(199975237)

//         // sell some yield-token
//         result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 2*ONE_8);
//         position =result.expectOk().expectTuple();
//         position['dx'].expectUint(199975237);
//         position['dy'].expectUint(2*ONE_8);

//         // yield-token now has "actual" balance
//         call = chain.callReadOnlyFn("yield-token-pool", "get-pool-details", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         position = call.result.expectOk().expectTuple();
//         position['balance-token'].expectUint(99800024763);
//         position['balance-aytoken'].expectUint(2*ONE_8);
//         position['balance-virtual'].expectUint(1000*ONE_8);         
            
//         // now that yield token supply > token supply, yield is positive.
//         call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         call.result.expectOk().expectUint(2847);

//         // buy back some yield token
//         result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, ONE_8);
//         position = result.expectOk().expectTuple()
//         position['dx'].expectUint(ONE_8);
//         position['dy'].expectUint(100028858);        

//         // attempt to sell more than max allowed yield token (50% of pool) must throw an error
//         result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 501*ONE_8);
//         position =result.expectErr().expectUint(4002)

//         call = chain.callReadOnlyFn("yield-token-pool", "get-pool-details", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         position = call.result.expectOk().expectTuple();
//         position['balance-token'].expectUint(99900024763);
//         position['balance-aytoken'].expectUint(99971142);
//         position['balance-virtual'].expectUint(1000*ONE_8); 

//         // after buying back some yield token, yield decreases.
//         call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         call.result.expectOk().expectUint(1426);

//         // we sell close to maximum allowed of yield token
//         result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 29*ONE_8);
//         position =result.expectOk().expectTuple();
//         position['dx'].expectUint(2900524394);
//         position['dy'].expectUint(29*ONE_8);                      

//         // which moves yield substantially into the positive territory.
//         call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         call.result.expectOk().expectUint(42661);   
        
//         // simulate to be on half way to expiry
//         chain.mineEmptyBlockUntil((expiry / ONE_8) / 2)      
        
//         // check t == 0.5
//         call = chain.callReadOnlyFn("yield-token-pool", "get-t", 
//             [types.uint(expiry),
//              types.uint(listed)
//             ], deployer.address);
//         call.result.expectOk().expectUint(355308)

//         // about half way, so yield should halve, just like zero coupon bond gets closer to par
//         call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         call.result.expectOk().expectUint(21334);
        
//         // sell some (a lot of) yield-token
//         result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 100*ONE_8);
//         position =result.expectOk().expectTuple();
//         position['dx'].expectUint(10001386469);
//         position['dy'].expectUint(100*ONE_8);       
            
//         // and see how it pushes the yield pretty high
//         call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         call.result.expectOk().expectUint(92959);   

//         //buy back some yield token
//         result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, 100*ONE_8);
//         position =result.expectOk().expectTuple();
//         position['dx'].expectUint(100*ONE_8);
//         position['dy'].expectUint(10005727560);      

//         // simulate to right before expiry
//         chain.mineEmptyBlockUntil((expiry / ONE_8) - 1)      
        
//         // confirm t is almost zero.
//         call = chain.callReadOnlyFn("yield-token-pool", "get-t", 
//             [types.uint(expiry),
//              types.uint(listed)
//             ], deployer.address);
//         call.result.expectOk().expectUint(11)

//         // nearly maturity, so yield should be close to zero.
//         call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         call.result.expectOk().expectUint(5);    
        
//         // buy some yield-token
//         result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, 19*ONE_8);
//         position =result.expectOk().expectTuple();
//         position['dx'].expectUint(19*ONE_8);
//         position['dy'].expectUint(1900017814);

//         // on expiry, the prices are back to parity.
//         call = chain.callReadOnlyFn("yield-token-pool", "get-price", 
//             [types.principal(yieldwbtc59760Address)
//             ], deployer.address);
//         call.result.expectOk().expectUint(100000005); // par          

//     },    
// });