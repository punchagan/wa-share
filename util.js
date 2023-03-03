const isMessage = msg =>
  msg.includes(":") && !msg.trim().endsWith(": <Media omitted>");

const convertDate = (dateStr, format) => {
  const parts = dateStr.split(format.separator);
  const m = parts[format.monthIndex];
  const month = m.length < 2 ? `0${m}` : m;
  const d = parts[format.dayIndex];
  const day = d.length < 2 ? `0${d}` : d;
  const year_ = parts[format.yearIndex];
  const year = format.yearLength === 2 ? `20${year_}` : year_;
  return `${year}-${month}-${day}`;
};

const selectBestFormat = (validFormats, dates) => {
  /* Look for number of changes in month and day, and choose the format with
   * least number of month changes */
  const listChangesCount = items => {
    let count = 0;
    let current = items[0];
    for (const i of items) {
      if (i !== current) {
        current = i;
        count++;
      }
    }
    return count;
  };

  const changes = validFormats.map(format => {
    const splitDates = dates.map(d => d.split(format.separator));
    const dayChanges = listChangesCount(
      splitDates.map(d => d[format.dayIndex])
    );
    const monthChanges = listChangesCount(
      splitDates.map(d => d[format.monthIndex])
    );
    return [monthChanges, dayChanges, format];
  });
  // Use the format where monthChanges are fewer
  changes.sort();
  return changes[0][2];
};

const isValidDateFormat = (dateStr, format, today) => {
  const parts = dateStr.split(format.separator);
  if (parts.length !== 3) {
    return false;
  }
  const day = parseInt(parts[format.dayIndex]);
  const month = parseInt(parts[format.monthIndex]);
  let year = parseInt(parts[format.yearIndex]);
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return false;
  }
  if (format.yearLength === 2) {
    year = 2000 + year; // assuming all dates in the list are in the 21st century
  }
  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day ||
    dateObj > today
  ) {
    return false;
  }
  return true;
};

const guessDateFormat = dates => {
  const formats = [
    { separator: "/", dayIndex: 0, monthIndex: 1, yearIndex: 2, yearLength: 4 },
    { separator: "/", dayIndex: 0, monthIndex: 1, yearIndex: 2, yearLength: 2 },
    { separator: "/", dayIndex: 1, monthIndex: 0, yearIndex: 2, yearLength: 4 },
    { separator: "/", dayIndex: 1, monthIndex: 0, yearIndex: 2, yearLength: 2 }
  ];

  const today = new Date();

  const validFormats = formats.filter(format => {
    for (const date of dates) {
      if (!isValidDateFormat(date, format, today)) {
        return false;
      }
    }
    return true;
  });

  switch (validFormats.length) {
    case 0:
      return {};
    case 1:
      return validFormats[0];
    default:
      // Try to use most changed field to detect valid date format
      return selectBestFormat(validFormats, dates);
  }
};

const processData = data => {
  const m = data.split(/\n*(\d{1,2}\/\d{1,2}\/\d{2,4}), (.*?) - /).slice(1);
  let messages = m
    .map(
      (d, idx) =>
        idx % 3 === 0 && isMessage(m[idx + 2]) && [d, m[idx + 1], m[idx + 2]]
    )
    .filter(mm => mm);
  const dates = messages.map(([d, _, __]) => d);
  const dateFormat = guessDateFormat(dates);
  document.querySelector("#instructions").style.display = "none";

  if (!dateFormat.separator) {
    messages = [];
    const alertDiv = document.querySelector("#alert");
    alertDiv.innerText = `Could not find valid date format in text:\n\n ${data}`;
  } else {
    messages = messages.map(([d, t, m]) => [convertDate(d, dateFormat), t, m]);
    updateCopyMessagesUI(messages);
    window.messages = messages;
  }
};

const updateCopyMessagesUI = messages => {
  const n = messages.length;
  if (n > 0) {
    // Update date selectors
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

    // Update sender selector
    const senders = Array.from(
      new Set(messages.map(([_, __, t]) => t.split(":")[0]))
    ).sort();
    const senderEl = document.querySelector("#sender");
    if (senders.length > 1) {
      senders.map(s => {
        const optionEl = document.createElement("option");
        optionEl.value = s;
        optionEl.innerText = s;
        optionEl.selected = true;
        senderEl.append(optionEl);
      });
    } else {
      senderEl.parentElement.style.display = "none";
    }

    const copyDiv = document.querySelector("#copy-messages-ui");
    copyDiv.style.display = "block";
  } else {
    const alertDiv = document.querySelector("#alert");
    alertDiv.innerText = "No messages found to copy!";
  }
};

/*NOTE: This is a very basic regex that may be good enough for this use case*/
const hasLink = msg => msg.match(/(https?:\/\/[^\s]+)/g) !== null;

const toggleSelection = () => {
  const senderEl = document.querySelector("#sender");
  const newState = !senderEl.options[0].selected;
  [...senderEl.options].map(option => {
    option.selected = newState;
  });
};

const doShare = (text, n, files) => {
  const shareData = {
    text: text,
    files: files
  };
  const alertDiv = document.querySelector("#alert");

  if (!navigator.canShare(shareData)) {
    alertDiv.textContent =
      "Permission denied for sharing the files by the browser";
    return;
  }

  (async () => {
    try {
      await navigator.share(shareData);
      onCopy(text, n);
      const m = shareData.files.length;
      alertDiv.innerText = `Share ${n} messages with ${m} attachments`;
    } catch (err) {
      alertDiv.innerText = `Error: ${err}`;
    }
  })();
};

const shareMessages = () => {
  const [text, n] = generateShareText();
  const files = window.attachedFiles.filter(f =>
    text.includes(`${f.name} (file attached)`)
  );
  doShare(text, n, files);
};

const generateShareText = () => {
  const startDateEl = document.querySelector("#start-date");
  const endDateEl = document.querySelector("#end-date");
  const start = startDateEl.value;
  const end = endDateEl.value;
  console.log(`Copying messages from ${start} to ${end}`);
  const { messages } = window;

  const senderEl = document.querySelector("#sender");
  const nOptions = senderEl.options.length;
  const nSelected = senderEl.selectedOptions.length;
  const selectedSenders = new Set(
    [...senderEl.selectedOptions].map(o => o.value)
  );

  const linksOnly = document.querySelector("#links").checked;

  const filtered = messages
    .filter(m => m[0] >= start && m[0] <= end)
    .filter(
      m =>
        nSelected === nOptions ? true : selectedSenders.has(m[2].split(":")[0])
    )
    .filter(m => (linksOnly ? hasLink(m[2]) : true))
    .map(m => {
      const msg = m[2];
      const n = msg.indexOf(":");
      return msg.slice(n + 2);
    });
  const separator = document.querySelector("#separator").value;
  return [filtered.join(`\n${separator}\n`), filtered.length];
};

const onCopy = (text, n) => {
  navigator.clipboard.writeText(text);
  const alertDiv = document.querySelector("#alert");
  alertDiv.innerText = `Copied ${n} messages to the clipboard`;
  document.querySelector("#copied-text").innerText = text;
  document.querySelector("#copied").style.display = "block";
};

/* Click handler for Copy Messages button */
const copyMessages = () => {
  const [text, n] = generateShareText();
  onCopy(text, n);
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
    // The first file a note to the user about what has been attached
    // Other media files are attached after the text file
    const dataFile = event.data.files[1];
    window.attachedFiles = event.data.files.slice(2);
    if (window.attachedFiles.length > 10) {
      // FIXME: investigate work around or prompt user to select attachments to
      // share? or iterate over them in batches?
      const msg =
        "*NOTE*: Currently, Chrome + Android PWAs seem to allow only a maximum of 10 attachments. The Share feature will fail when trying to share a larger number of files.";
      const alertDiv = document.querySelector("#alert");
      alertDiv.innerText = msg;
    }
    dataFile.text().then(data => processData(data));
  });
}
