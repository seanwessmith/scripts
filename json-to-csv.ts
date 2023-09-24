const courseJson = require("./mi-course-difficulties.json");
const fs = require("fs");

const main = async () => {
  const csvArr: string[] = [];
  for (const row of courseJson) {
    const cells = Object.values(row);
    csvArr.push(cells.join(","));
  }
  fs.writeFileSync("./mi-course-difficulties.csv", csvArr.join("\n"));
};
main();
