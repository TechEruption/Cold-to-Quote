(function () {
  "use strict";

  const data = window.APP_DATA && window.APP_DATA.outreach;
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = [
    document.getElementById("panel-linkedin"),
    document.getElementById("panel-emails"),
    document.getElementById("panel-content")
  ];

  function addEditor(card, label, value, field) {
    const wrapper = document.createElement("label");
    wrapper.className = "outreach-editor";
    const caption = document.createElement("span");
    caption.textContent = label;
    const textarea = document.createElement("textarea");
    textarea.rows = field === "body" ? 7 : 2;
    textarea.value = value || "";
    textarea.dataset.field = field;
    textarea.setAttribute("aria-label", label);
    wrapper.append(caption, textarea);
    card.appendChild(wrapper);
  }

  function getSaved(itemId) {
    return window.JDApp.getState().outreach[itemId] || {};
  }

  function createCard(itemId, heading, item) {
    const card = document.createElement("article");
    card.className = "outreach-card";
    card.dataset.itemId = itemId;

    const header = document.createElement("div");
    header.className = "outreach-card-header";
    const title = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "outreach-card-kicker";
    eyebrow.textContent = heading;
    const cardTitle = document.createElement("h2");
    cardTitle.textContent = item.subject || item.title || heading;
    title.append(eyebrow, cardTitle);

    const copy = document.createElement("button");
    copy.className = "secondary-button";
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", function () {
      copyCardText(card);
    });
    header.append(title, copy);
    card.appendChild(header);

    const saved = getSaved(itemId);
    if (item.subject !== undefined) {
      addEditor(card, "Subject", saved.subject !== undefined ? saved.subject : item.subject, "subject");
    }
    if (item.title !== undefined) {
      addEditor(card, "Title", saved.title !== undefined ? saved.title : item.title, "title");
    }
    addEditor(card, "Message", saved.body !== undefined ? saved.body : item.body, "body");

    const actions = document.createElement("div");
    actions.className = "outreach-card-actions";
    const save = document.createElement("button");
    save.className = "primary-button";
    save.type = "button";
    save.textContent = "Save edits";
    save.addEventListener("click", function () {
      const values = {};
      card.querySelectorAll("textarea[data-field]").forEach(function (textarea) {
        values[textarea.dataset.field] = textarea.value;
      });
      try {
        window.JDApp.updateOutreachItem(itemId, values);
        cardTitle.textContent = values.subject || values.title || heading;
      } catch (error) {
        window.JDApp.notify("Could not save outreach edits: " + error.message, "error");
      }
    });
    actions.appendChild(save);
    card.appendChild(actions);
    return card;
  }

  async function copyCardText(card) {
    const text = Array.from(card.querySelectorAll("textarea[data-field]"))
      .map(function (textarea) {
        const label = textarea.closest("label").querySelector("span").textContent;
        return label + ": " + textarea.value;
      })
      .join("\n\n");

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        copyWithSelection(text);
      }
      window.JDApp.notify("Draft copied to clipboard.");
    } catch (error) {
      try {
        copyWithSelection(text);
        window.JDApp.notify("Draft copied to clipboard.");
      } catch (fallbackError) {
        window.JDApp.notify("Could not copy draft: " + fallbackError.message, "error");
      }
    }
  }

  function copyWithSelection(text) {
    const temporary = document.createElement("textarea");
    temporary.value = text;
    temporary.setAttribute("readonly", "");
    temporary.className = "clipboard-fallback";
    document.body.appendChild(temporary);
    temporary.select();
    const copied = document.execCommand("copy");
    temporary.remove();
    if (!copied) {
      throw new Error("Clipboard access is unavailable in this browser.");
    }
  }

  function renderPanels() {
    const state = window.JDApp.getState();
    panels.forEach(function (panel) {
      panel.replaceChildren();
    });

    panels[0].appendChild(createCard(
      "linkedinMessage",
      "LinkedIn message",
      Object.assign({}, data.linkedinMessage, state.outreach.linkedinMessage)
    ));
    data.emails.forEach(function (email, index) {
      panels[1].appendChild(createCard(
        "email-" + index,
        "Email · Day " + email.day,
        Object.assign({}, email, state.outreach["email-" + index])
      ));
    });
    data.posts.forEach(function (post, index) {
      panels[2].appendChild(createCard(
        "post-" + index,
        post.type === "carousel" ? "Carousel idea" : "Post idea",
        Object.assign({}, post, state.outreach["post-" + index])
      ));
    });
  }

  function selectTab(index, moveFocus) {
    tabs.forEach(function (tab, tabIndex) {
      const active = tabIndex === index;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[tabIndex].hidden = !active;
    });
    if (moveFocus) {
      tabs[index].focus();
    }
  }

  if (!data || !data.linkedinMessage || !Array.isArray(data.emails) || !Array.isArray(data.posts)) {
    window.JDApp.notify("Outreach data is unavailable.", "error");
    return;
  }

  try {
    renderPanels();
    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        selectTab(index, false);
      });
      tab.addEventListener("keydown", function (event) {
        let nextIndex = index;
        if (event.key === "ArrowRight") {
          nextIndex = (index + 1) % tabs.length;
        } else if (event.key === "ArrowLeft") {
          nextIndex = (index + tabs.length - 1) % tabs.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = tabs.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        selectTab(nextIndex, true);
      });
    });
    window.addEventListener("jd-lead-data-change", function (event) {
      if (event.detail && event.detail.reset) {
        renderPanels();
      }
    });
  } catch (error) {
    window.JDApp.notify("Could not load outreach drafts: " + error.message, "error");
  }
})();
