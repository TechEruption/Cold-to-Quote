(function () {
  "use strict";

  const STORAGE_KEY = "jd-jones-lead-prototype";
  const NAV_ITEMS = [
    { href: "index.html", label: "Overview" },
    { href: "accounts.html", label: "Accounts" },
    { href: "outreach.html", label: "Outreach" },
    { href: "tracker.html", label: "Lead tracker" }
  ];
  const FOLLOW_UP_DELAY = 2 * 24 * 60 * 60 * 1000;
  let followUpTimer = null;
  let reminderAccounts = null;

  function getMessageElement() {
    return document.getElementById("app-message");
  }

  function notify(message, kind) {
    const element = getMessageElement();
    if (!element) {
      return;
    }

    element.textContent = message;
    if (kind) {
      element.dataset.kind = kind;
    } else {
      delete element.dataset.kind;
    }
  }

  function renderNavigation() {
    const nav = document.querySelector("[data-app-nav]");
    if (!nav) {
      return;
    }

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const links = NAV_ITEMS.map(function (item) {
      const current = item.href === currentPage;
      return '<a class="nav-link" href="' + item.href + '"' +
        (current ? ' aria-current="page"' : "") + ">" +
        item.label + "</a>";
    }).join("");

    nav.innerHTML = links +
      '<button class="reset-button" type="button" data-reset-data>Reset data</button>';
  }

  function renderFooter() {
    const footer = document.querySelector("[data-app-footer]");
    if (footer) {
      footer.textContent = "Concept prototype by [My Name]. Not affiliated with JD Jones.";
    }
  }

  function readState() {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return { leads: {}, outreach: {}, targets: {}, reminders: {} };
    }

    const state = JSON.parse(stored);
    if (!state || typeof state !== "object" || !state.leads ||
        typeof state.leads !== "object" || Array.isArray(state.leads) ||
        (state.outreach !== undefined &&
          (!state.outreach || typeof state.outreach !== "object" || Array.isArray(state.outreach))) ||
        (state.targets !== undefined &&
          (!state.targets || typeof state.targets !== "object" || Array.isArray(state.targets))) ||
        (state.reminders !== undefined &&
          (!state.reminders || typeof state.reminders !== "object" || Array.isArray(state.reminders)))) {
      throw new Error("Saved lead data has an invalid format.");
    }
    state.outreach = state.outreach || {};
    state.targets = state.targets || {};
    state.reminders = state.reminders || {};
    return state;
  }

  function getState() {
    return readState();
  }

  function updateLead(leadId, field, value) {
    if (typeof leadId !== "string" || leadId.trim() === "") {
      throw new TypeError("A lead ID is required.");
    }
    if (field !== "status" && field !== "stage" && field !== "notes") {
      throw new TypeError('Lead field must be "status", "stage", or "notes".');
    }
    if (typeof value !== "string") {
      throw new TypeError("Lead values must be text.");
    }

    const state = readState();
    const lead = state.leads[leadId] || {};
    if ((field === "stage" || field === "status") && value === "Contacted" &&
        !Number.isFinite(lead.contactedAt)) {
      lead.contactedAt = Date.now();
    }
    if ((field === "stage" || field === "status") && value === "Not contacted") {
      delete lead.contactedAt;
    }
    lead[field] = value;
    state.leads[leadId] = lead;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("jd-lead-data-change", {
      detail: { leadId: leadId, field: field, value: value }
    }));
    notify("Lead changes saved on this device.");
  }

  function updateOutreachItem(itemId, values) {
    if (typeof itemId !== "string" || itemId.trim() === "") {
      throw new TypeError("An outreach item ID is required.");
    }
    if (!values || typeof values !== "object" || Array.isArray(values) ||
        Object.keys(values).some(function (key) {
          return typeof values[key] !== "string";
        })) {
      throw new TypeError("Outreach edits must be text fields.");
    }

    const state = readState();
    state.outreach[itemId] = Object.assign({}, state.outreach[itemId], values);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("jd-lead-data-change", {
      detail: { outreachItemId: itemId, values: values }
    }));
    notify("Outreach changes saved on this device.");
  }

  function updateTargets(values) {
    const allowed = ["replyRate", "meetingRate", "quoteRate"];
    if (!values || typeof values !== "object" || Array.isArray(values) ||
        Object.keys(values).some(function (key) {
          return allowed.indexOf(key) === -1 ||
            typeof values[key] !== "number" ||
            !Number.isFinite(values[key]) ||
            values[key] < 0 ||
            values[key] > 100;
        })) {
      throw new TypeError("KPI target values must be percentages from 0 to 100.");
    }

    const state = readState();
    state.targets = Object.assign({}, state.targets, values);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("jd-lead-data-change", {
      detail: { targets: values }
    }));
    notify("Assumption targets saved on this device.");
  }

  function resetData() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("jd-lead-data-change", {
      detail: { reset: true }
    }));
    notify("Saved prototype data has been reset.");
  }

  function showFollowUpReminder(accounts) {
    reminderAccounts = accounts;
    const state = readState();
    let needsSave = false;
    accounts.forEach(function (account) {
      const lead = state.leads[account.id] || {};
      const stage = lead.stage || lead.status || account.stage;
      if (stage === "Contacted" && !Number.isFinite(lead.contactedAt)) {
        lead.contactedAt = Date.now();
        state.leads[account.id] = lead;
        needsSave = true;
      }
    });
    if (needsSave) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    const activeContacts = accounts.map(function (account) {
      const lead = state.leads[account.id] || {};
      const stage = lead.stage || lead.status || account.stage;
      return {
        account: account,
        contactedAt: lead.contactedAt,
        active: stage === "Contacted" && Number.isFinite(lead.contactedAt)
      };
    });
    const now = Date.now();
    const dismissedUntil = Number(state.reminders.dismissedUntil) || 0;
    const nextReminderAt = activeContacts.reduce(function (nextTime, contact) {
      if (!contact.active) {
        return nextTime;
      }
      const eligibleAt = Math.max(contact.contactedAt + FOLLOW_UP_DELAY, dismissedUntil);
      return Math.min(nextTime, eligibleAt);
    }, Infinity);

    window.clearTimeout(followUpTimer);
    if (Number.isFinite(nextReminderAt) && nextReminderAt > now) {
      followUpTimer = window.setTimeout(function () {
        showFollowUpReminder(accounts);
      }, Math.min(nextReminderAt - now, 2147483647));
    }

    const dueAccounts = activeContacts
      .filter(function (contact) {
        return contact.active && contact.contactedAt + FOLLOW_UP_DELAY <= now;
      })
      .map(function (contact) {
        return contact.account;
      });

    if (dueAccounts.length === 0) {
      const existingDialog = document.querySelector("[data-follow-up-dialog]");
      if (existingDialog) {
        existingDialog.remove();
        document.querySelector(".follow-up-backdrop").remove();
      }
      return;
    }
    if (now < dismissedUntil || document.querySelector("[data-follow-up-dialog]")) {
      return;
    }
    window.clearTimeout(followUpTimer);

    const backdrop = document.createElement("div");
    backdrop.className = "follow-up-backdrop";
    const dialog = document.createElement("section");
    dialog.className = "follow-up-dialog";
    dialog.dataset.followUpDialog = "";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "follow-up-title");
    dialog.setAttribute("aria-describedby", "follow-up-description");

    const heading = document.createElement("h2");
    heading.id = "follow-up-title";
    heading.textContent = "Follow-up reminder";
    const description = document.createElement("p");
    description.id = "follow-up-description";
    description.textContent = dueAccounts.length === 1
      ? "No reply has been recorded for this account after two days."
      : "No reply has been recorded for these accounts after two days.";
    const list = document.createElement("ul");
    dueAccounts.forEach(function (account) {
      const item = document.createElement("li");
      item.textContent = account.company;
      list.appendChild(item);
    });
    const actions = document.createElement("div");
    actions.className = "follow-up-actions";
    const goToAccounts = document.createElement("a");
    goToAccounts.className = "primary-button";
    goToAccounts.href = "accounts.html";
    goToAccounts.textContent = "Review accounts";
    const remindTomorrow = document.createElement("button");
    remindTomorrow.className = "secondary-button";
    remindTomorrow.type = "button";
    remindTomorrow.textContent = "Remind me tomorrow";
    actions.append(goToAccounts, remindTomorrow);
    const previousFocus = document.activeElement;
    dialog.append(heading, description, list, actions);
    document.body.append(backdrop, dialog);

    function dismissForTomorrow() {
      const latestState = readState();
      latestState.reminders.dismissedUntil = Date.now() + 24 * 60 * 60 * 1000;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(latestState));
      backdrop.remove();
      dialog.remove();
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
      showFollowUpReminder(accounts);
    }

    remindTomorrow.addEventListener("click", dismissForTomorrow);
    goToAccounts.addEventListener("click", dismissForTomorrow);
    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissForTomorrow();
      }
      if (event.key === "Tab") {
        const focusable = [goToAccounts, remindTomorrow];
        if (event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    });
    remindTomorrow.focus();
  }

  function handleResetClick(event) {
    if (!event.target.closest("[data-reset-data]")) {
      return;
    }
    if (window.confirm("Reset all locally saved lead statuses, notes, outreach edits, and KPI assumptions?")) {
      try {
        resetData();
      } catch (error) {
        notify("Could not reset saved data: " + error.message, "error");
      }
    }
  }

  renderNavigation();
  renderFooter();
  document.addEventListener("click", handleResetClick);

  try {
    readState();
  } catch (error) {
    notify("Could not read saved data: " + error.message, "error");
  }

  window.JDApp = Object.freeze({
    getState: getState,
    updateLead: updateLead,
    updateOutreachItem: updateOutreachItem,
    updateTargets: updateTargets,
    resetData: resetData,
    notify: notify,
    storageKey: STORAGE_KEY
  });

  window.addEventListener("jd-account-data-ready", function (event) {
    try {
      showFollowUpReminder(event.detail.accounts);
    } catch (error) {
      notify("Could not check follow-up reminders: " + error.message, "error");
    }
  });

  window.addEventListener("jd-lead-data-change", function () {
    if (reminderAccounts) {
      try {
        showFollowUpReminder(reminderAccounts);
      } catch (error) {
        notify("Could not check follow-up reminders: " + error.message, "error");
      }
    }
  });

  window.addEventListener("load", function () {
    if (window.APP_DATA && Array.isArray(window.APP_DATA.accounts)) {
      try {
        showFollowUpReminder(window.APP_DATA.accounts);
      } catch (error) {
        notify("Could not check follow-up reminders: " + error.message, "error");
      }
    }
  });
})();
