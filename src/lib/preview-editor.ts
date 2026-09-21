export const EDITOR_MARKER = "data-ghighais-editor";

export const EDITOR_SCRIPT = `
(function () {
  var selected = null;
  var history = [];
  var editingSnapshotTaken = false;
  var lastChange = { key: "", time: 0 };
  var style = document.createElement("style");
  style.setAttribute("${EDITOR_MARKER}", "");
  style.textContent =
    "[data-gh-selected]{outline:2px solid #22d3ee !important;outline-offset:2px !important;}" +
    "*{cursor:default !important;}" +
    "[data-gh-selected]{cursor:move !important;}";
  document.documentElement.appendChild(style);

  function post(type, payload) {
    parent.postMessage(Object.assign({ source: "ghighais-preview", type: type }, payload || {}), "*");
  }

  function bodySnapshot() {
    var clone = document.body.cloneNode(true);
    clone.querySelectorAll("[${EDITOR_MARKER}]").forEach(function (n) { n.remove(); });
    clone.querySelectorAll("[data-gh-selected]").forEach(function (n) { n.removeAttribute("data-gh-selected"); });
    clone.querySelectorAll("[contenteditable]").forEach(function (n) { n.removeAttribute("contenteditable"); });
    return clone.innerHTML;
  }

  function remember(key) {
    var now = Date.now();
    if (key && lastChange.key === key && now - lastChange.time < 700) {
      lastChange.time = now;
      return;
    }
    var snapshot = bodySnapshot();
    if (history[history.length - 1] !== snapshot) history.push(snapshot);
    if (history.length > 50) history.shift();
    lastChange = { key: key || "", time: now };
    post("history", { canUndo: history.length > 0 });
  }

  function select(el) {
    if (selected) selected.removeAttribute("data-gh-selected");
    selected = el;
    if (!el) return post("selection", { info: null });
    el.setAttribute("data-gh-selected", "");
    var cs = getComputedStyle(el);
    var bg = cs.backgroundImage || "";
    var bgMatch = bg.match(/url\\(["']?(.*?)["']?\\)/);
    var isImg = el.tagName.toLowerCase() === "img";
    var isSvg = el.tagName.toLowerCase() === "svg" || !!el.querySelector("svg");
    post("selection", {
      info: {
        tag: el.tagName.toLowerCase(),
        text: el.children.length === 0 ? el.textContent || "" : "",
        color: cs.color,
        background: cs.backgroundColor,
        fontSize: parseFloat(cs.fontSize) || 16,
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height),
        isImage: isImg || !!bgMatch || isSvg,
        imageSrc: isImg ? el.getAttribute("src") || "" : bgMatch ? bgMatch[1] : ""
      }
    });
  }

  document.addEventListener(
    "click",
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      var el = e.target;
      if (!el || el === document.documentElement) return;
      select(el);
    },
    true
  );

  document.addEventListener("submit", function (e) { e.preventDefault(); }, true);

  // drag to move
  var dragging = null;
  document.addEventListener(
    "mousedown",
    function (e) {
      var el = e.target;
      if (!el || !el.getAttribute || !el.hasAttribute("data-gh-selected")) return;
      var cs = getComputedStyle(el);
      var base = el.__ghOffset || { x: 0, y: 0 };
      remember("drag");
      dragging = { el: el, startX: e.clientX, startY: e.clientY, base: base };
      if (cs.position === "static") el.style.position = "relative";
      e.preventDefault();
    },
    true
  );
  document.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var x = dragging.base.x + (e.clientX - dragging.startX);
    var y = dragging.base.y + (e.clientY - dragging.startY);
    dragging.el.__ghOffset = { x: x, y: y };
    dragging.el.style.left = x + "px";
    dragging.el.style.top = y + "px";
  });
  document.addEventListener("mouseup", function () { dragging = null; });
  document.addEventListener("beforeinput", function (e) {
    if (!e.target || !e.target.getAttribute || e.target.getAttribute("contenteditable") !== "true") return;
    if (!editingSnapshotTaken) {
      remember("direct-edit");
      editingSnapshotTaken = true;
    }
  }, true);
  document.addEventListener("blur", function () { editingSnapshotTaken = false; }, true);

  function clean() {
    var clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("[${EDITOR_MARKER}]").forEach(function (n) { n.remove(); });
    clone.querySelectorAll("[data-gh-selected]").forEach(function (n) { n.removeAttribute("data-gh-selected"); });
    clone.querySelectorAll("[contenteditable]").forEach(function (n) { n.removeAttribute("contenteditable"); });
    return "<!DOCTYPE html>\\n<html" + attrs(clone) + ">" + clone.innerHTML + "</html>";
  }

  function attrs(el) {
    var out = "";
    for (var i = 0; i < el.attributes.length; i++) {
      out += " " + el.attributes[i].name + '="' + el.attributes[i].value + '"';
    }
    return out;
  }

  window.addEventListener("message", function (e) {
    var msg = e.data || {};
    if (msg.source !== "ghighais-parent") return;
    if (msg.type === "apply") { post("applied", { html: clean() }); return; }
    if (msg.type === "undo") {
      var previous = history.pop();
      if (typeof previous === "string") {
        document.body.innerHTML = previous;
        selected = null;
        post("selection", { info: null });
      }
      post("history", { canUndo: history.length > 0 });
      lastChange = { key: "", time: 0 };
      return;
    }
    if (!selected) return;
    if (msg.type !== "editable") remember(msg.type);
    switch (msg.type) {
      case "text":
        selected.textContent = msg.value;
        break;
      case "color":
        selected.style.color = msg.value;
        break;
      case "background":
        selected.style.backgroundColor = msg.value;
        break;
      case "fontSize":
        selected.style.fontSize = msg.value + "px";
        break;
      case "width":
        selected.style.width = msg.value + "px";
        break;
      case "height":
        selected.style.height = msg.value + "px";
        break;
      case "move": {
        var cs = getComputedStyle(selected);
        if (cs.position === "static") selected.style.position = "relative";
        var base = selected.__ghOffset || { x: 0, y: 0 };
        base = { x: base.x + (msg.dx || 0), y: base.y + (msg.dy || 0) };
        selected.__ghOffset = base;
        selected.style.left = base.x + "px";
        selected.style.top = base.y + "px";
        break;
      }
      case "editable":
        editingSnapshotTaken = false;
        selected.setAttribute("contenteditable", "true");
        selected.focus();
        break;
      case "image": {
        var url = msg.value || "";
        if (!url) break;
        var tag = selected.tagName.toLowerCase();
        if (tag === "img") {
          selected.setAttribute("src", url);
          selected.removeAttribute("srcset");
        } else if ((getComputedStyle(selected).backgroundImage || "").indexOf("url(") >= 0) {
          selected.style.backgroundImage = 'url("' + url + '")';
          selected.style.backgroundSize = selected.style.backgroundSize || "cover";
          selected.style.backgroundPosition = "center";
        } else {
          var rect = selected.getBoundingClientRect();
          var img = document.createElement("img");
          img.setAttribute("src", url);
          img.setAttribute("alt", "");
          img.style.width = Math.round(rect.width || 120) + "px";
          img.style.height = Math.round(rect.height || 120) + "px";
          img.style.objectFit = "contain";
          selected.replaceWith(img);
          select(img);
        }
        break;
      }
      case "delete": {
        var el = selected;
        select(null);
        el.remove();
        break;
      }
    }
  });

  post("ready", {});
  post("history", { canUndo: false });
})();
`;
