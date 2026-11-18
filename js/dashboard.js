(function () {
  "use strict";

  const stages = ["Not contacted", "Contacted", "Replied", "Catalogue sent", "Meeting", "Quote"];
  const accounts = window.APP_DATA && window.APP_DATA.accounts;
  const metrics = document.getElementById("dashboard-metrics");
  const conversions = document.getElementById("conversion-list");
  const chart = document.getElementById("stage-chart");
  const form = document.getElementById("target-form");

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

  function accountStage(account, state) {
    const lead = state.leads[account.id] || {};
    const stage = lead.stage || lead.status || account.stage;
    return stages.includes(stage) ? stage : account.stage;
  }

  function renderTargets(state) {
    document.getElementById("reply-target").value =
      state.targets.replyRate !== undefined ? state.targets.replyRate : 20;
    document.getElementById("meeting-target").value =
      state.targets.meetingRate !== undefined ? state.targets.meetingRate : 10;
    document.getElementById("quote-target").value =
      state.targets.quoteRate !== undefined ? state.targets.quoteRate : 5;
  }

  function render() {
    try {
      const state = window.JDApp.getState();
      const counts = stages.reduce(function (result, stage) {
        result[stage] = 0;
        return result;
      }, {});
      accounts.forEach(function (account) {
        counts[accountStage(account, state)] += 1;
      });

      const cumulative = {
        total: accounts.length,
        contacted: accounts.length - counts["Not contacted"],
        replied: accounts.length - counts["Not contacted"] - counts.Contacted,
        meetings: counts.Meeting + counts.Quote,
        quotes: counts.Quote
      };
      cumulative.catalogue = counts["Catalogue sent"] + cumulative.meetings;
      const summary = [
        ["Total accounts", cumulative.total],
        ["Contacted", cumulative.contacted],
        ["Replied", cumulative.replied],
        ["Meetings", cumulative.meetings],
        ["Quotes", cumulative.quotes]
      ];
      metrics.replaceChildren();
      summary.forEach(function (item, index) {
        const card = make("article", "metric-card" + (index === 0 ? " metric-primary" : ""));
        card.appendChild(make("span", "metric-label", item[0]));
        card.appendChild(make("strong", "metric-value", String(item[1])));
        metrics.appendChild(card);
      });

      const conversionSteps = [
        ["All accounts", "Contacted", cumulative.contacted, cumulative.total],
        ["Contacted", "Replied", cumulative.replied, cumulative.contacted],
        ["Replied", "Catalogue sent", cumulative.catalogue, cumulative.replied],
        ["Catalogue sent", "Meeting", cumulative.meetings, cumulative.catalogue],
        ["Meeting", "Quote", cumulative.quotes, cumulative.meetings]
      ];
      conversions.replaceChildren();
      conversionSteps.forEach(function (step) {
        const row = make("div", "conversion-row");
        row.appendChild(make("span", "conversion-stage", step[0] + " → " + step[1]));
        const percent = step[3] === 0 ? "—" : Math.round((step[2] / step[3]) * 100) + "%";
        row.appendChild(make("strong", "conversion-value", percent));
        conversions.appendChild(row);
      });

      chart.replaceChildren();
      stages.forEach(function (stage) {
        const row = make("div", "stage-bar-row");
        row.appendChild(make("span", "stage-bar-label", stage));
        const track = make("div", "stage-bar-track");
        const bar = make("span", "stage-bar");
        const width = accounts.length ? (counts[stage] / accounts.length) * 100 : 0;
        bar.style.width = width + "%";
        track.appendChild(bar);
        row.append(track, make("strong", "stage-bar-count", String(counts[stage])));
        chart.appendChild(row);
      });
      renderTargets(state);
    } catch (error) {
      window.JDApp.notify("Could not calculate dashboard: " + error.message, "error");
    }
  }

  if (!Array.isArray(accounts)) {
    window.JDApp.notify("Account data is unavailable.", "error");
    return;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    try {
      window.JDApp.updateTargets({
        replyRate: Number(document.getElementById("reply-target").value),
        meetingRate: Number(document.getElementById("meeting-target").value),
        quoteRate: Number(document.getElementById("quote-target").value)
      });
    } catch (error) {
      window.JDApp.notify("Could not save assumptions: " + error.message, "error");
    }
  });

  render();
  window.addEventListener("jd-lead-data-change", render);
  window.dispatchEvent(new CustomEvent("jd-account-data-ready", {
    detail: { accounts: accounts }
  }));
})();
