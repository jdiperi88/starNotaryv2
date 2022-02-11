const StarNotary = artifacts.require("StarNotary");

var accounts;
var owner;

contract("StarNotary", (accs) => {
  accounts = accs;
  owner = accounts[0];
});

it("can Create a Star", async () => {
  let tokenId = 1;
  let instance = await StarNotary.deployed();
  await instance.createStar("Awesome Star!", tokenId, { from: accounts[0] });
  assert.equal(await instance.tokenIdToStarInfo.call(tokenId), "Awesome Star!");
});

it("lets user1 put up their star for sale", async () => {
  let instance = await StarNotary.deployed();
  let user1 = accounts[1];
  let starId = 2;
  let starPrice = web3.utils.toWei(".01", "ether");
  await instance.createStar("awesome star", starId, { from: user1 });
  await instance.putStarUpForSale(starId, starPrice, { from: user1 });
  assert.equal(await instance.starsForSale.call(starId), starPrice);
});

it("lets user1 get the funds after the sale", async () => {
  let instance = await StarNotary.deployed();
  let user1 = accounts[1];
  let user2 = accounts[2];
  let starId = 3;
  let starPrice = web3.utils.toWei(".01", "ether");
  let balance = web3.utils.toWei(".05", "ether");
  const balanceBeforeUser1BuysStar = web3.utils.toBN(
    await web3.eth.getBalance(user1)
  );
  await instance.createStar("awesome star", starId, { from: user1 });
  await instance.putStarUpForSale(starId, starPrice, { from: user1 });
  // let balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user1);

  await instance.approve(user2, starId, { from: user1, value: 0 });
  await instance.buyStar(starId, { from: user2, value: balance });
  let balanceOfUser1AfterTransaction = await web3.eth.getBalance(user1);
  const balanceAfterUser1BuysStar = web3.utils.toBN(
    await web3.eth.getBalance(user1)
  );

  const txInfo = await instance.buyStar(starId, {
    from: user2,
    value: balance,
  });

  let value1 = Number(balanceBeforeUser1BuysStar) + Number(starPrice);
  let value2 = Number(balanceAfterUser1BuysStar);
  console.log(value1);
  assert.equal(value1, value2);
});

it("lets user2 buy a star, if it is put up for sale", async () => {
  let instance = await StarNotary.deployed();
  let user1 = accounts[1];
  let user2 = accounts[2];
  let starId = 4;
  let starPrice = web3.utils.toWei(".01", "ether");
  let balance = web3.utils.toWei(".05", "ether");
  await instance.createStar("awesome star", starId, { from: user1 });
  await instance.putStarUpForSale(starId, starPrice, { from: user1 });
  let balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user2);
  await instance.approve(user2, starId, { from: user1, value: 0 });
  await instance.buyStar(starId, { from: user2, value: balance });
  assert.equal(await instance.ownerOf.call(starId), user2);
});

it("lets user2 buy a star and decreases its balance in ether", async () => {
  let instance = await StarNotary.deployed();
  let user1 = accounts[1];
  let user2 = accounts[2];
  let starId = 5;
  let starPrice = web3.utils.toWei(".01", "ether");
  let balance = web3.utils.toWei(".05", "ether");
  await instance.createStar("awesome star", starId, { from: user1 });
  await instance.putStarUpForSale(starId, starPrice, { from: user1 });
  const balanceOfUser2BeforeTransaction = web3.utils.toBN(
    await web3.eth.getBalance(user2)
  );
  await instance.approve(user2, starId, { from: user1, value: 0 });
  const txInfo = await instance.buyStar(starId, {
    from: user2,
    value: balance,
  });
  const balanceAfterUser2BuysStar = web3.utils.toBN(
    await web3.eth.getBalance(user2)
  );

  // Important! Note that because these are big numbers (more than Number.MAX_SAFE_INTEGER), we
  // need to use the BN operations, instead of regular operations, which cause mathematical errors.
  // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
  // console.log("Ok  = " + (balanceOfUser2BeforeTransaction.sub(balanceAfterUser2BuysStar)).toString());
  // console.log("Bad = " + (balanceOfUser2BeforeTransaction - balanceAfterUser2BuysStar).toString());

  // calculate the gas fee
  const tx = await web3.eth.getTransaction(txInfo.tx);
  const gasPrice = web3.utils.toBN(tx.gasPrice);
  const gasUsed = web3.utils.toBN(txInfo.receipt.gasUsed);
  const txGasCost = gasPrice.mul(gasUsed);

  // make sure that [final_balance == initial_balance - star_price - gas_fee]
  const starPriceBN = web3.utils.toBN(starPrice); // from string
  const expectedFinalBalance = balanceOfUser2BeforeTransaction
    .sub(starPriceBN)
    .sub(txGasCost);
  assert.equal(
    expectedFinalBalance.toString(),
    balanceAfterUser2BuysStar.toString()
  );
});
