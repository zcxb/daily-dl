const { createBrowser, closeAllPages, closeBrowser } = require("./browser");
const Pixiv = require("./jobs/pixiv");

global.ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";

let timer = null;
let browser = null;
const run = async () => {
  try {
    if (!browser) {
      browser = await createBrowser();
    }
    await Pixiv.run(browser);
  } catch (error) {}
  timer = setTimeout(async () => {
    await run();
  }, 5 * 60 * 1000);
};

(async () => {
  await run();
  process.on("SIGTERM", async function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    await closeAllPages(browser);
    await closeBrowser(browser);
    browser = null;
    process.exit(0);
  });
})();
