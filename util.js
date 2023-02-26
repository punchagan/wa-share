// FIXME: Improve check?
const isMessage = msg => msg.includes(":");

const convertDate = date_ => {
  // NOTE: We assume that browser language matches the OS language
  let month, date, year;
  if (navigator.language === "en-US") {
    [month, date, year] = date_.split("/");
  } else {
    [date, month, year] = date_.split("/");
  }
  const d = new Date([month, date, year]);
  d.setMinutes(-d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
};

const processData = data => {
  const m = data.split(/\n*(\d{1,2}\/\d{1,2}\/\d{1,2}), (.*?) - /).slice(1);
  const messages = m
    .map(
      (d, idx) =>
        idx % 3 === 0 &&
        isMessage(m[idx + 2]) && [convertDate(d), m[idx + 1], m[idx + 2]]
    )
    .filter(mm => mm);

  window.messages = messages;

  const copyDiv = document.querySelector("#copy-messages-ui");
  const alertDiv = document.querySelector("#alert");
  const n = messages.length;
  document.querySelector("#instructions").style.display = "none";

  if (n > 0) {
    const dates = messages.map(([d, _, __]) => d);
    const dateRange = [dates[0], dates[n - 1]];

    const startDateEl = document.querySelector("#start-date");
    startDateEl.value = dateRange[0];
    startDateEl.min = dateRange[0];
    startDateEl.max = dateRange[1];

    const endDateEl = document.querySelector("#end-date");
    endDateEl.value = dateRange[1];
    endDateEl.min = dateRange[0];
    endDateEl.max = dateRange[1];

    copyDiv.style.display = "block";
  } else {
    alertDiv.innerText = "No messages found to copy!";
  }
};

const copyMessages = () => {
  const startDateEl = document.querySelector("#start-date");
  const endDateEl = document.querySelector("#end-date");
  const start = startDateEl.value;
  const end = endDateEl.value;
  console.log(`Copying messages from ${start} to ${end}`);
  const { messages } = window;
  const filtered = messages.filter(m => m[0] >= start && m[0] <= end).map(m => {
    const msg = m[2];
    const n = msg.indexOf(":");
    return msg.slice(n + 2);
  });
  const alertDiv = document.querySelector("#alert");
  const separator = document.querySelector("#separator").value;
  const text = filtered.join(`\n${separator}\n`);
  navigator.clipboard.writeText(text);
  alertDiv.innerText = `Copied ${filtered.length} messages to the clipboard`;
  document.querySelector("#copied-text").innerText = text;
  document.querySelector("#copied").style.display = "block";
};

if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(function(reg) {
      console.log("Service worker registered.");
    })
    .catch(function(err) {
      console.log("Service worker not registered. This happened:", err);
    });

  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data.action !== "chat") return;
    const dataFile = event.data.files[1];
    dataFile.text().then(data => processData(data));
  });
}
