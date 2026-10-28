import type { Page } from "@playwright/test";

type Scenario = "login" | "verify" | "link" | "invalid" | "offline" | "cancel";
// Stub only the external SDK boundary. Browser -> BFF -> Redis -> fixture backend stays real.
export async function installOAuthSdk(page: Page, scenario: Scenario = "login") {
  await page.route("https://accounts.google.com/gsi/client?*", route => route.fulfill({ contentType: "text/javascript", body: `
    let config;
    window.google = {accounts: {id: {
      initialize(options) { config = options; },
      renderButton(parent) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Tiếp tục với Google';
        button.onclick = () => config.callback({credential: 'fixture:google:${scenario}:provider-token'});
        parent.replaceChildren(button);
      }
    }}};
  ` }));
  await page.route("https://connect.facebook.net/vi_VN/sdk.js", route => route.fulfill({ contentType: "text/javascript", body: `
    window.FB = {init() {}, login(callback) {
      callback(${JSON.stringify(scenario === "cancel" ? {} : { authResponse: { accessToken: `fixture:facebook:${scenario}:provider-token` } })});
    }};
  ` }));
}
