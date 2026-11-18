(function () {
  "use strict";

  const stages = ["Not contacted", "Contacted", "Replied", "Catalogue sent", "Meeting", "Quote"];
  const accounts = window.APP_DATA && window.APP_DATA.accounts;
  const board = document.getElementById("tracker-board");

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (text !== undefined) {
      node.textContent = text;
    }
    return node;
  }

  function stageFor(account, state) {
    const lead = state.leads[account.id] || {};
    const stage = lead.stage || lead.status || account.stage;
    return stages.includes(stage) ? stage : account.stage;
  }

  function render() {
    try {
      const state = window.JDApp.getState();
      board.replaceChildren();

      stages.forEach(function (stage) {
        const column = make("section", "tracker-column");
        column.setAttribute("aria-label", stage + " accounts");
        const heading = make("div", "tracker-column-heading");
        const title = make("h2", "", stage);
        const accountsInStage = accounts.filter(function (account) {
          return stageFor(account, state) === stage;
        });
        const count = make("span", "column-count", String(accountsInStage.length));
        count.setAttribute("aria-label", accountsInStage.length + " accounts");
        heading.append(title, count);
        column.appendChild(heading);

        const list = make("div", "tracker-card-list");
        accountsInStage.forEach(function (account) {
          const card = make("article", "tracker-card");
          card.appendChild(make("h3", "", account.company));
          card.appendChild(make("p", "tracker-card-segment", account.segment + " · " + account.location));

          const label = make("label", "tracker-stage-label");
          label.appendChild(make("span", "", "Move to"));
          const select = make("select", "stage-select");
          select.setAttribute("aria-label", "Move " + account.company + " to another stage");
          stages.forEach(function (optionStage) {
            const option = make("option", "", optionStage);
            option.value = optionStage;
            select.appendChild(option);
          });
          select.value = stage;
          select.addEventListener("change", function () {
            try {
              window.JDApp.updateLead(account.id, "stage", select.value);
            } catch (error) {
              window.JDApp.notify("Could not move account: " + error.message, "error");
              render();
            }
          });
          label.appendChild(select);
          card.appendChild(label);
          list.appendChild(card);
        });
        if (accountsInStage.length === 0) {
          list.appendChild(make("p", "tracker-empty", "No accounts here yet."));
        }
        column.appendChild(list);
        board.appendChild(column);
      });
    } catch (error) {
      board.replaceChildren(make("p", "empty-state", "Could not load pipeline data: " + error.message));
      window.JDApp.notify("Could not load tracker: " + error.message, "error");
    }
  }

  if (!Array.isArray(accounts)) {
    window.JDApp.notify("Account data is unavailable.", "error");
    return;
  }
  render();
  window.addEventListener("jd-lead-data-change", render);
  window.dispatchEvent(new CustomEvent("jd-account-data-ready", {
    detail: { accounts: accounts }
  }));
})();
