(function () {
  "use strict";

  const stages = ["Not contacted", "Contacted", "Replied", "Catalogue sent", "Meeting", "Quote"];
  const accounts = window.APP_DATA && window.APP_DATA.accounts;
  const rows = document.getElementById("account-rows");
  const search = document.getElementById("account-search");
  const segmentFilter = document.getElementById("segment-filter");
  const priorityFilter = document.getElementById("priority-filter");
  const count = document.getElementById("account-count");
  const empty = document.getElementById("account-empty");
  const panel = document.getElementById("account-panel");
  const panelContent = document.getElementById("panel-content");
  const backdrop = document.getElementById("account-backdrop");
  let selectedAccount = null;
  let lastFocusedElement = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function savedLead(account) {
    return window.JDApp.getState().leads[account.id] || {};
  }

  function renderSegmentOptions() {
    const segments = Array.from(new Set(accounts.map(function (account) {
      return account.segment;
    }))).sort();

    segments.forEach(function (segment) {
      const option = element("option", "", segment);
      option.value = segment;
      segmentFilter.appendChild(option);
    });
  }

  function filteredAccounts() {
    const query = search.value.trim().toLowerCase();
    return accounts.filter(function (account) {
      const matchesSearch = !query || [
        account.company, account.segment, account.location,
        account.whyFit, account.targetRole
      ].join(" ").toLowerCase().includes(query);
      return matchesSearch &&
        (!segmentFilter.value || account.segment === segmentFilter.value) &&
        (!priorityFilter.value || account.priority === priorityFilter.value);
    });
  }

  function renderRows() {
    rows.replaceChildren();
    let visible;
    try {
      visible = filteredAccounts();
      visible.forEach(function (account) {
        const saved = savedLead(account);
        const row = element("tr", "account-row");
        row.tabIndex = 0;
        row.dataset.accountId = account.id;
        row.setAttribute("aria-label", "View details for " + account.company);

        const company = element("td", "company-cell", account.company);
        const segment = element("td", "", account.segment);
        const location = element("td", "", account.location);
        const priority = element("td");
        priority.appendChild(element("span", "priority-badge priority-" + account.priority.toLowerCase(), account.priority));
        const stageCell = element("td");
        const stageSelect = element("select", "stage-select");
        stageSelect.setAttribute("aria-label", "Stage for " + account.company);
        stages.forEach(function (stage) {
          const option = element("option", "", stage);
          option.value = stage;
          stageSelect.appendChild(option);
        });
        stageSelect.value = saved.stage || saved.status || account.stage;
        if (!stages.includes(stageSelect.value)) {
          stageSelect.value = account.stage;
        }
        stageSelect.addEventListener("click", function (event) {
          event.stopPropagation();
        });
        stageSelect.addEventListener("keydown", function (event) {
          event.stopPropagation();
        });
        stageSelect.addEventListener("change", function () {
          try {
            window.JDApp.updateLead(account.id, "stage", stageSelect.value);
          } catch (error) {
            window.JDApp.notify("Could not save stage: " + error.message, "error");
            stageSelect.value = saved.stage || saved.status || account.stage;
          }
        });
        stageCell.appendChild(stageSelect);
        row.append(company, segment, location, priority, stageCell);
        row.addEventListener("click", function () {
          openPanel(account, row);
        });
        row.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPanel(account, row);
          }
        });
        rows.appendChild(row);
      });
      count.textContent = visible.length + (visible.length === 1 ? " account" : " accounts");
      empty.hidden = visible.length !== 0;
    } catch (error) {
      count.textContent = "Accounts unavailable";
      empty.hidden = false;
      empty.textContent = "Could not load saved account data: " + error.message;
      window.JDApp.notify("Could not load accounts: " + error.message, "error");
    }
  }

  function renderPanel() {
    if (!selectedAccount) {
      return;
    }
    const account = selectedAccount;
    const saved = savedLead(account);
    panelContent.replaceChildren();

    const header = element("div", "panel-header");
    const titleWrap = element("div");
    titleWrap.appendChild(element("p", "eyebrow", account.segment));
    const title = element("h2", "", account.company);
    title.id = "panel-title";
    titleWrap.appendChild(title);
    const close = element("button", "panel-close", "Close");
    close.type = "button";
    close.addEventListener("click", closePanel);
    header.append(titleWrap, close);
    panelContent.appendChild(header);

    const details = [
      ["Location", account.location],
      ["Target role", account.targetRole],
      ["Priority", account.priority],
      ["Why it may fit", account.whyFit]
    ];
    const detailList = element("dl", "account-details");
    details.forEach(function (detail) {
      detailList.appendChild(element("dt", "", detail[0]));
      detailList.appendChild(element("dd", "", detail[1]));
    });
    panelContent.appendChild(detailList);

    const notesLabel = element("label", "field-label panel-notes");
    const notesTitle = element("span", "", "Notes");
    const notes = element("textarea", "");
    notes.id = "account-notes";
    notes.rows = 5;
    notes.value = saved.notes !== undefined ? saved.notes : account.notes;
    notesLabel.append(notesTitle, notes);
    panelContent.appendChild(notesLabel);

    const save = element("button", "primary-button", "Save notes");
    save.type = "button";
    save.addEventListener("click", function () {
      try {
        window.JDApp.updateLead(account.id, "notes", notes.value);
      } catch (error) {
        window.JDApp.notify("Could not save notes: " + error.message, "error");
      }
    });
    panelContent.appendChild(save);
  }

  function openPanel(account, trigger) {
    selectedAccount = account;
    lastFocusedElement = trigger;
    try {
      renderPanel();
      panel.hidden = false;
      backdrop.hidden = false;
      panel.querySelector(".panel-close").focus();
    } catch (error) {
      panel.hidden = true;
      backdrop.hidden = true;
      window.JDApp.notify("Could not open account details: " + error.message, "error");
    }
  }

  function closePanel() {
    selectedAccount = null;
    panel.hidden = true;
    backdrop.hidden = true;
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  function trapPanelFocus(event) {
    if (event.key !== "Tab" || panel.hidden) {
      return;
    }

    const focusable = Array.from(panel.querySelectorAll(
      'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter(function (item) {
      return item.offsetWidth || item.offsetHeight || item.getClientRects().length;
    });
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!Array.isArray(accounts)) {
    window.JDApp.notify("Account data is unavailable.", "error");
    count.textContent = "Accounts unavailable";
  } else {
    renderSegmentOptions();
    renderRows();
    search.addEventListener("input", renderRows);
    segmentFilter.addEventListener("change", renderRows);
    priorityFilter.addEventListener("change", renderRows);
    backdrop.addEventListener("click", closePanel);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        closePanel();
      }
      trapPanelFocus(event);
    });
    window.addEventListener("jd-lead-data-change", renderRows);
    window.dispatchEvent(new CustomEvent("jd-account-data-ready", {
      detail: { accounts: accounts }
    }));
  }
})();
