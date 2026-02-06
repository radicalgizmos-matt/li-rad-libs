const browserAPI = chrome || browser;

browserAPI.action.onClicked.addListener(() => {
  if (browserAPI.runtime.openOptionsPage) {
    // Standard way to open options page
    browserAPI.runtime.openOptionsPage();
  } else {
    // Fallback for older browser versions (e.g. older Firefox versions)
    // You can use the runtime.getURL method to get the correct path
    browserAPI.tabs.create({ url: browserAPI.runtime.getURL("options/options.html") });
  }
});
