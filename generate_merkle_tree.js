const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')
const csv = require('csv-parser');
const fs = require('fs');
var utils = require('ethers').utils;

// import distribution from this file 
const filename = 'token-distribution-example.csv'

// what file should we write the merkel proofs too?
const output_file = 'token-distribution-example-tree.json'

// create our token distribution
const user_dist_list = []
const token_dist = []

// open csv 
fs.createReadStream(filename)
  .pipe(csv())
  .on('data', (row) => {
    // import each record line by line
    const user_dist = [row['user_id'], row['total']] // create record to track user_id of leaves 
    user_hash = utils.solidityKeccak256([ 'uint32', 'uint256'], [row['user_id'], row['total']]); // hash up the user_id and amount Solidity style    
    user_dist_list.push(user_dist); // used for tracking user_id of each leaf so we can write to proofs file accordingly 
    token_dist.push(user_hash) // used for crafting the actual tree
    if (row['user_id'] == '9530') {
        console.log('user_hash: ', user_hash)
     } 
  })
  .on('end', () => {
    // create merkle tree from token distribution 
    const merkle_tree = new MerkleTree(token_dist, keccak256, { hashLeaves: true, sortPairs: true });
    // get root of our tree 
    const root = merkle_tree.getHexRoot();
    // create proof file 
    write_leaves(merkle_tree, user_dist_list, token_dist, root)
  });

  // write leaves & proofs proofs to json file 
  function write_leaves(merkle_tree, user_dist_list, token_dist, root) {
    console.log('Begin writing leaves to file...')
    full_dist = {}
    for (line = 0; line < user_dist_list.length; line++) {
        // generate leaf hash from raw data
        const leaf = keccak256(token_dist[line]);
        // create dist object
        const user_dist = {
            leaf: '0x' + leaf.toString('hex'),
            proof: merkle_tree.getHexProof(leaf)
        }
        if (user_dist_list[line][0] == '9530') {
          console.log('leaf hash: ', leaf.toString('hex'))
       } 
        // add record to our distribution 
        full_dist[user_dist_list[line][0]] = user_dist;
    } 
    fs.writeFile(output_file, JSON.stringify(full_dist, null, 4), (err) => {
        if (err) {
            console.error(err);
            return;
        };
        console.log(output_file, "has been written with a root hash of:\n", root);
    });
  }