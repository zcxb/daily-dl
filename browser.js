const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const chalk = require("chalk");
const { wait, log_error } = require("./utils");
const { _2captcha, proxy_server } = require("./configs/config.json");

puppeteer.use(StealthPlugin());
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: _2captcha.apikey, // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
    },
    visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
  })
);
const createBrowser = async () => {
  const args = [
    "--disable-extensions",
    "--hide-scrollbars",
    "--disable-bundled-ppapi-flash",
    "--mute-audio",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu",
    "--disable-web-security",
    "--disable-infobars",
    "--window-size=800,600",
  ];
  if (proxy_server) {
    args.push(`--proxy-server=${proxy_server}`);
  }
  const browser = await puppeteer.launch({
    headless: false,
    args,
    ignoreDefaultArgs: ["--enable-automation"],
    ignoreHTTPSErrors: true,
    devtools: false,
    dumpio: false,
    defaultViewport: {
      width: 800,
      height: 600,
    },
  });

  return browser;
};

const closeBrowser = async (browser) => {
  try {
    if (!browser) {
      return;
    }
    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));
    await wait(1000);
    await browser.close();
    browser = null;
    await wait(1000);
  } catch (error) {
    log_error(`closeBrower method: ${error.message}`);
    return false;
  }
};

const closeAllPages = async (browser) => {
  try {
    if (!browser) {
      return;
    }
    const pages = await browser.pages();
    await Promise.all(pages.map((page) => page.close()));
    await wait(1000);
  } catch (error) {
    log_error(`closeBrower method: ${error.message}`);
    return false;
  }
};

const createPage = async (browser) => {
  return await browser.newPage();
};

module.exports = { createBrowser, closeBrowser, createPage, closeAllPages };
