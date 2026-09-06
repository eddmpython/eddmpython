import sitePackage from "../../../../site/package.json";

const versions = ["pdfjs-dist", "tesseract.js", "@tesseract.js-data/kor", "@tesseract.js-data/eng", "@fontsource/nanum-gothic"] as const;
export const runtimeBase = `/assets/pdf-table-runtime/${versions.map(name => sitePackage.dependencies[name]).join("_")}/`;
