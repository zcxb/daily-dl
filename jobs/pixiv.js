const axios = require("axios");
const fse = require("fs-extra");
const { wait, waitForLocalFunction, waitFor } = require("../utils");
const { createPage } = require("../browser");
const { pixiv } = require("../configs/config.json");
const dayjs = require("dayjs");
const { resolve } = require("path");

const url_main = "https://www.pixiv.net/";
const url_r18 = "https://www.pixiv.net/ranking.php?mode=daily_r18";
const pixiv_cookie_path = "./pixiv_cookies.json";

class Pixiv {
  static async run(browser) {
    await Pixiv.try_login(browser);
    await Pixiv.do_collect(browser);
  }

  static async try_login(browser) {
    // console.log("pixiv config: ", pixiv);
    const { account, pwd } = pixiv;
    let page = null;
    try {
      page = await createPage(browser);
      const exist_cookies = await fse.pathExists(pixiv_cookie_path);
      if (exist_cookies) {
        const cookies = await fse.readJson(pixiv_cookie_path);
        await page.setCookie(...cookies);
        return;
      }

      let login_button_clicked = false;
      let cookies_saved = null;
      await page.on("response", async (response) => {
        const url = response.url();
        const request = response.request();
        const method = request.method();
        if (login_button_clicked && url === "https://www.pixiv.net/" && method === "GET") {
          const cookies = await page.cookies();
          await fse.ensureFile(pixiv_cookie_path);
          await fse.writeJson(pixiv_cookie_path, cookies);
          cookies_saved = cookies;
        }
      });

      await page.goto(url_main, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });

      const login_button = await page.$(".signup-form__submit--login");
      if (login_button) {
        await page.click(".signup-form__submit--login");
        await wait(2000);
      }

      // await wait(20000);

      const username_input = await page.waitForXPath(`//input[@autocomplete="username"]`);
      if (username_input) {
        await page.type(`input[autocomplete="username"]`, account);
      }
      const pwd_input = await page.waitForXPath(`//input[@autocomplete="current-password"]`);
      if (pwd_input) {
        await page.type(`input[autocomplete="current-password"]`, pwd);
      }
      const [submit_button] = await page.$x(`//input[@autocomplete="username"]/../../../button`);
      await submit_button.click();
      login_button_clicked = true;
      await wait(5000);

      await waitForLocalFunction(
        () => {
          return cookies_saved;
        },
        200,
        30000
      );
      console.log(cookies_saved);
    } catch (error) {
      console.error(error);
    } finally {
      if (page) {
        await page.close();
        page = null;
        await wait(1000);
      }
    }
  }

  static async do_collect(browser) {
    let page = null;
    try {
      page = await createPage(browser);

      await page.goto(url_r18, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
      await wait(2000);

      const { res, msg } = await waitFor(page, `.ranking-items-container`);
      if (!res) {
        throw new Error(msg);
      }

      const image_el_list = await page.$x(`//div[@class='ranking-image-item']/a`);
      for (const image_el of image_el_list) {
        const illust_url = await page.evaluate((el) => el.href, image_el);
        await Pixiv.dl_illust_images(browser, illust_url);
      }
      console.log(1);
    } catch (error) {
      console.error(error);
    } finally {
      if (page) {
        await page.close();
        page = null;
        await wait(1000);
      }
    }
  }

  static async dl_illust_images(browser, illust_url) {
    console.log("start dl: ", illust_url);
    let page = null;
    try {
      page = await createPage(browser);

      await page.goto(illust_url, {
        waitUntil: "networkidle2",
        timeout: 60000,
        referer: url_r18,
      });

      // first image
      const illust_image_xpath = `//figure//a[@rel='noopener']/img`;
      const { res, msg } = await waitFor(page, illust_image_xpath);
      if (!res) {
        // 可能是动图
        console.log("这个有问题", illust_url, msg);
        return;
      }

      const [expand_all_button] = await page.$x(`//button[contains(.,'查看全部')]`);
      if (expand_all_button) {
        console.log("有多图...");
        await expand_all_button.click();
        await wait(5000);
        const { res, msg } = await waitFor(page, illust_image_xpath);
        if (!res) {
          // 可能是动图
          console.log("这个有问题", illust_url, msg);
          return;
        }
      }

      const illust_image_el_list = await page.$x(illust_image_xpath);
      for (const illust_image_el_item of illust_image_el_list) {
        const image_url = await page.evaluate((el) => el.src, illust_image_el_item);
        console.log("image_url: ", image_url);
        const buf = await Pixiv.dl_image_inner(browser, image_url);
        await Pixiv.save_image(buf, { illust_url, image_url });
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (page) {
        await page.close();
        page = null;
        await wait(1000);
      }
    }
  }

  static async dl_image_inner(browser, image_url) {
    let page = null;
    try {
      page = await createPage(browser);

      let image_buf = null;
      await page.on("response", async (response) => {
        const url = response.url();
        const request = response.request();
        const method = request.method();

        if (url === image_url && method === "GET") {
          image_buf = await response.buffer();
        }
      });

      await page.goto(image_url, {
        waitUntil: "networkidle2",
        timeout: 60000,
        referer: url_r18,
      });

      await waitForLocalFunction(
        () => {
          return image_buf;
        },
        200,
        30000
      );

      console.log("dl success");
      return image_buf;
    } catch (error) {
      console.error(error);
    } finally {
      if (page) {
        await page.close();
        page = null;
        await wait(1000);
      }
    }
  }

  static async save_image(buf, { illust_url, image_url }) {
    const image_url_splited = image_url.split("/");
    const filename = image_url_splited[image_url_splited.length - 1];
    const file = resolve(__dirname, `pixiv_dl/${dayjs().format("YY/MM/DD")}`, filename);
    // await fse.ensureFile(fd);
    await fse.outputFile(file, buf);
  }
}

module.exports = Pixiv;
