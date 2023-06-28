const wait = (ms, rand_ext) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const waitFor = async (page, selector, timeout = 15000) => {
  if (!selector) {
    return;
  }
  try {
    if (selector.startsWith("//")) {
      await page.waitForXPath(selector, {
        timeout,
      });
    } else {
      await page.waitForSelector(selector, {
        timeout,
      });
    }
    return { res: true };
  } catch (error) {
    return { res: false, msg: `页面加载超时: ${selector}` };
  }
};

const waitForLocalFunction = async (func, offtime, timeout) => {
  let ct = 0;
  while (true) {
    const isdone = func();

    if (isdone) {
      return undefined;
    }

    if (ct > timeout) {
      break;
    }

    await wait(offtime);
    ct += offtime;
  }

  return new Error("waitForFunction timeout");
};

const getCookie = async (page, name) => {
  const cookies = await page.cookies();
  for (const cookie of cookies) {
    if (cookie.name === name) {
      return cookie;
    }
  }
};

const setCookies = async (cookies_str, page, domain) => {
  let cookies = cookies_str.split(";").map((pair) => {
    let name = pair.trim().slice(0, pair.trim().indexOf("="));
    let value = pair.trim().slice(pair.trim().indexOf("=") + 1);
    return { name, value, domain };
  });
  await Promise.all(
    cookies.map((pair) => {
      return page.setCookie(pair);
    })
  );
};

module.exports = {
  wait,
  waitFor,
  waitForLocalFunction,
  getCookie,
  setCookies,
};
