(() => {
  'use strict';
  const autoSortEnabled   = document.getElementById('autoSortEnabled');
  const autoSortColumn    = document.getElementById('autoSortColumn');
  const autoSortDirection = document.getElementById('autoSortDirection');
  const subSettings       = document.getElementById('subSettings');
  const savedMsg          = document.getElementById('savedMsg');
  // Direction labels change based on selected column
  const DIR_LABELS = {
    date:    { asc: 'Oldest first',    desc: 'Newest first' },
    name:    { asc: 'A → Z',           desc: 'Z → A' },
    message: { asc: 'A → Z',           desc: 'Z → A' }
  };
  function updateDirectionLabels() {
    const col = autoSortColumn.value;
    const labels = DIR_LABELS[col] || DIR_LABELS.date;
    autoSortDirection.options[0].textContent = labels.desc;
    autoSortDirection.options[1].textContent = labels.asc;
  }
  function updateSubSettingsState() {
    subSettings.classList.toggle('disabled', !autoSortEnabled.checked);
  }
  function flashSaved() {
    savedMsg.classList.add('visible');
    setTimeout(() => savedMsg.classList.remove('visible'), 1500);
  }
  function save() {
    const settings = {
      autoSortEnabled:   autoSortEnabled.checked,
      autoSortColumn:    autoSortColumn.value,
      autoSortDirection: autoSortDirection.value
    };
    chrome.storage.sync.set(settings, flashSaved);
  }
  // Load settings
  chrome.storage.sync.get(
    { autoSortEnabled: false, autoSortColumn: 'date', autoSortDirection: 'desc' },
    (s) => {
      autoSortEnabled.checked   = s.autoSortEnabled;
      autoSortColumn.value      = s.autoSortColumn;
      autoSortDirection.value   = s.autoSortDirection;
      updateDirectionLabels();
      updateSubSettingsState();
    }
  );
  // Listeners
  autoSortEnabled.addEventListener('change', () => {
    updateSubSettingsState();
    save();
  });
  autoSortColumn.addEventListener('change', () => {
    updateDirectionLabels();
    save();
  });
  autoSortDirection.addEventListener('change', save);
})();