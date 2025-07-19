// Animation state
let isAnimating = false;

// Function to get text from content script
async function getPageText(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "getPageText",
    });
    return response;
  } catch (error) {
    return null;
  }
}

// Function to trigger the content script
async function triggerContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "copyText" });
  } catch (error) {}
}

// Function to animate the extension action and show notification
async function animateExtension(tabId, url) {
  if (isAnimating) return;
  isAnimating = true;

  try {
    // Create notification
    await chrome.notifications.create("instruction-notification", {
      type: "basic",
      iconUrl: chrome.runtime.getURL("images/logobig.png"),
      title: "Just The Instructions Ready!",
      message: "One click → Clean steps",
      priority: 2,
      requireInteraction: false,
      silent: false,
      buttons: [],
      isClickable: true,
    });

    //Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      chrome.notifications.clear("instruction-notification");
    }, 5000);
  } catch (error) {
  } finally {
    isAnimating = false;
  }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId === "instruction-notification") {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) {
      // Send special action to trigger GPT extraction
      await chrome.tabs.sendMessage(tab.id, {
        action: "triggerGPTExtraction",
        autoExtract: true,
      });
    }
    chrome.notifications.clear(notificationId);
  }
});

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.tabs.sendMessage(tab.id, { action: "toggleFloatingUI" });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Check if the page has finished loading and it's a http/https URL
  if (changeInfo.status === "complete" && tab.url?.startsWith("http")) {
    // Trigger content script to copy text
    await chrome.tabs.sendMessage(tabId, { action: "extractInstructions" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "instructionAnalysis") {
    // Only show notification if strong instructions found
    if (["strong"].includes(message.tier)) {
      chrome.storage.local.get("notificationsEnabled", (res) => {
        const notificationsAllowed = res.notificationsEnabled !== false; // defaults to true

        if (!notificationsAllowed) {
          return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            animateExtension(tabs[0].id, tabs[0].url);
          }
        });
      });
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("userId", (data) => {
    if (!data.userId) {
      const uuid = crypto.randomUUID();
      chrome.storage.local.set({ userId: uuid }, () => {});
    }
  });
});
