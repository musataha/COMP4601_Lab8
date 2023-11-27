const fs = require("fs");
const { Matrix } = require("ml-matrix");
let textFile = "parsed-data-trimmed.txt";
// let textFile = "test3.txt";
let numUsers;
let users;
let numItems;
let items;
let matrix;
let ogMatrix;
let zeroCells = [];
function readFile(file) {
  try {
    const fileContent = fs.readFileSync(textFile, "utf-8");
    const lines = fileContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (i == 0) {
        [numUsers, numItems] = lines[i].split(" ").map(Number);
        ogMatrix = new Matrix(numUsers, numItems);
      } else if (i == 1) {
        users = lines[i].split(" ");
      } else if (i == 2) {
        items = lines[i].split(" ");
      } else if (!lines[i].length == 0) {
        let ratings = lines[i].split(" ");
        for (let j = 0; j < ratings.length; j++) {
          if (ratings[j] == 0) {
            zeroCells.push([i - 3, j]);
          }
        }
        beforeMatrix(i - 3, ratings);
      }
    }
  } catch (err) {
    console.log("ERROR: reading file", err);
  }
}
function beforeMatrix(userNum, ratings) {
  for (let i = 0; i < ratings.length; i++) {
    ogMatrix.set(userNum, i, ratings[i]);
    matrix = ogMatrix.clone();
  }
  console.log(ogMatrix);
}
function cellPredictions() {
  for (let i = 0; i < zeroCells.length; i++) {
    let pccs = [];
    let cell = zeroCells[i];
    console.log(cell);
    let curUserAvg = averageRating(zeroCells[i]); //[user pos. , 0 pos.]
    for (let j = 0; j < ogMatrix.rows; j++) {
      if (j !== cell[0]) {
        let curRow = ogMatrix.getRow(j);
        let curRowAvg = averageRating([j, cell[1]]);
        let pcc = pearsonCC(cell[0], curUserAvg, j, curRowAvg);
        let curRating = ogMatrix.get(j, cell[1]);
        pccs.push([j, pcc, curRating, curRowAvg]);
      }
    }
    let predValue = neighbours(curUserAvg, pccs, 5); //5 represents num of neighbours
    console.log(predValue, "For row", i);
    matrix.set(cell[0], cell[1], predValue);
  }
  console.log("NEW", matrix);
}
function neighbours(userAvg, pccs, nSize) {
  pccs.sort((a, b) => b[1] - a[1]);
  let topNeighbours = pccs.slice(0, nSize);
  let sum = topNeighbours.reduce((total, current) => total + current[1], 0);
  console.log(topNeighbours, sum);
  let numerator = 0;
  for (let i = 0; i < topNeighbours.length; i++) {
    let neighbour = topNeighbours[i];
    numerator += neighbour[1] * (neighbour[2] - neighbour[3]);
  }
  return (pred = userAvg + (1 / sum) * numerator);
}
function pearsonCC(curUser, userAvg, curRowUser, rowAvg) {
  let ratingsCurUser = ogMatrix.getRow(curUser);
  let ratingsCurRowUser = ogMatrix.getRow(curRowUser);
  let commonItems = ratingsCurUser
    .map((rating, index) => {
      if (rating !== 0 && ratingsCurRowUser[index] !== 0) {
        return index;
      }
      return null;
    })
    .filter((item) => item !== null);

  let numerator = commonItems.reduce((sum, item) => {
    return sum + (ratingsCurUser[item] - userAvg) * (ratingsCurRowUser[item] - rowAvg);
  }, 0);

  let denominatorUser = Math.sqrt(
    commonItems.reduce((sum, item) => {
      return sum + Math.pow(ratingsCurUser[item] - userAvg, 2);
    }, 0)
  );
  let denominatorRowUser = Math.sqrt(
    commonItems.reduce((sum, item) => {
      return sum + Math.pow(ratingsCurRowUser[item] - rowAvg, 2);
    }, 0)
  );
  if (denominatorUser === 0 || denominatorRowUser === 0) {
    return 0;
  }
  return (pcc = numerator / (denominatorUser * denominatorRowUser));
}
function averageRating(c) {
  let curRatings = ogMatrix.getRow(c[0]);
  let nonZeroRatings = curRatings.filter((rating) => rating !== 0);
  let average = nonZeroRatings.length > 0 ? nonZeroRatings.reduce((sum, rating) => sum + rating, 0) / nonZeroRatings.length : 0;
  return average;
}
readFile(textFile);
cellPredictions();
