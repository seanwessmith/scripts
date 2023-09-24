function cleanVTT(text: string): string {
  const lines = text.split("\n");
  let output = "";

  // Flags to identify metadata, timestamps, and text
  let isMetadata = true;
  let isTimestamp = false;

  for (const line of lines) {
    if (isMetadata) {
      if (line === "") {
        isMetadata = false;
      }
      continue;
    }

    if (isTimestamp) {
      isTimestamp = false;
      continue;
    }

    // Check if line is a timestamp line
    if (/-->\s*/.test(line)) {
      isTimestamp = true;
      continue;
    }

    // Remove tags and add to output
    const cleanLine = line.replace(/<.*?>/g, "");
    output += cleanLine + " ";
  }

  return output;
}

async function readFileAndClean(filePath: string) {
  const data = await Bun.file(filePath).text();
  const cleanedText = cleanVTT(data);
  Bun.write(filePath, cleanedText);
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error("Please provide the path to the .vtt file as an argument.");
  process.exit(1);
}

const filePath = args[0];
readFileAndClean(filePath);
