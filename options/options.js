//NOTES: No prevention of duplicated targets for efficiency and simplicity (less UI friction).

const browserApi = chrome || browser;
const substitutionsList = document.getElementById('subs_list');
const addSubBtn = document.getElementById('add_sub');
const saveBtn = document.getElementById('save_btn');
const saveMsg = document.getElementById('save_msg');
const importBtn = document.getElementById('import_btn');
const importInput = document.getElementById('import_input');
const exportAllBtn = document.getElementById('export_all_btn');

const expandedIcon = '\u25BC'; // Down arrow
const collapsedIcon = '\u25B6'; // Right arrow

let substitutions = [];
let saveMsgTimeoutId = null;

/**
 * Renders the list of substitution forms based on the current substitutions array.
 */
const renderSubstitutions = () => {
  substitutionsList.innerHTML = '';
  
  substitutions.forEach((sub, index) => {
    const subDiv = createSubstitutionForm(sub, index);
    substitutionsList.appendChild(subDiv);
  });
};

/**
 * Stores the current form values to the substitutions array without saving to storage.
 * This allows re-rendering without losing unsaved changes.
 */
const storeFormsData = () => {
  const subForms = document.querySelectorAll('[data-index]');
  subForms.forEach((form) => {
    form.updateData();
  });
};

/**
 * Loads the substitutions from storage (if any) and renders them.
 */
const loadSubstitutionsAndRenderFromStorage = () => {
  browserApi.storage.local.get('li_rad_libs_subs', (data) => {
    substitutions = data.li_rad_libs_subs || [];
    renderSubstitutions();
  });
};

const getCurrentDateTimeString = () => {
    const date = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

const exportObject = (obj, fileNamePrefix) => {
  const jsonString = JSON.stringify(obj, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;

  const dateTimeStr = getCurrentDateTimeString();
  downloadLink.download = `${fileNamePrefix}_${dateTimeStr}.json`;

  document.body.appendChild(downloadLink);
  downloadLink.click();  
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
};

const exportSubstitution = (sub, index) => {
  exportObject(sub, `lirl_${index}`);
};

const getReplacementArray = (rawReplacements) => {
  return rawReplacements
    .split('\n')
    .map((r) => r.trim())
    .filter(r => r !== '')
};

/**
 * Creates a form for a single substitution configuration.
 * @param {Object} sub the existing substitution data (if any)
 * @param {Number} index the index of the substitution in the list
 * @returns the container element for the substitution form
 */
const createSubstitutionForm = (sub, index) => {
  // The main substitution container
  const container = document.createElement('div');
  container.className = 'sub-container';

  // Collapsible substitution header
  const header = document.createElement('div');
  header.className = 'sub-header';

  const headerToggle = document.createElement('span');
  headerToggle.className = 'sub-header-toggle';
  headerToggle.textContent = expandedIcon;

  const isExistingData = sub.target && sub.target.trim() !== '';

  const headerTitle = document.createElement('span');
  headerTitle.className = 'sub-header-title';
  headerTitle.textContent = `${index + 1}: `;
  if (isExistingData) {
    headerTitle.textContent += `${sub.target}`;
  } else {
    headerTitle.textContent += '(No target)';
  }
  
  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'X';
  deleteBtn.className = 'btn delete-btn';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent header toggle when clicking delete
    storeFormsData(); // Store any unsaved changes before deleting
    substitutions.splice(index, 1);
    renderSubstitutions();
  });

  // Export (individual) button
  const expIndBtn = document.createElement('button');
  expIndBtn.textContent = 'Export';
  expIndBtn.className = 'btn export-btn';
  expIndBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportSubstitution(sub, index+1);
  });
  
  header.appendChild(headerToggle);
  header.appendChild(headerTitle);
  header.appendChild(deleteBtn);
  header.appendChild(expIndBtn);

  // Collapsible substitution content container
  const contentContainer = document.createElement('div');
  contentContainer.className = 'sub-content';
  
  // Determine if this form should be collapsed by default
  // Collapse if it has existing data (target is not empty), expand if blank
  if (isExistingData) {
    contentContainer.style.display = 'none';
    headerToggle.textContent = collapsedIcon;
  }

  // Toggle collapse functionality
  header.addEventListener('click', () => {
    const isVisible = contentContainer.style.display !== 'none';
    contentContainer.style.display = isVisible ? 'none' : 'block';
    headerToggle.textContent = isVisible ? collapsedIcon : expandedIcon;
  });

  container.appendChild(header);
  container.appendChild(contentContainer);

  // Probability form row
  const probabilityRow = document.createElement('div');
  probabilityRow.className = 'form-row';

  const probabilityLabel = document.createElement('label');
  probabilityLabel.textContent = 'Rate (%):';
  probabilityLabel.className = 'form-label';

  const probabilityInput = document.createElement('input');
  probabilityInput.type = 'number';
  probabilityInput.min = '1';
  probabilityInput.max = '100';
  probabilityInput.step = '1';
  probabilityInput.value = sub.probability || 100;
  probabilityInput.className = 'prob-input';
  probabilityInput.addEventListener('input', () => {
    // Sanitize input to ensure it's a number between 1 and 100
    let raw = probabilityInput.value;
    if (raw === '') return;

    raw = raw.replace(/[^0-9]/g, '');
    if (raw === '') {
      probabilityInput.value = '';
      return;
    }

    let numericValue = parseInt(raw, 10);
    if (Number.isNaN(numericValue)) {
      probabilityInput.value = '';
      return;
    }

    if (numericValue < 1) numericValue = 1;
    if (numericValue > 100) numericValue = 100;
    probabilityInput.value = String(numericValue);
  });
  probabilityInput.addEventListener('blur', () => {
    // Default to 100 if left blank on blur
    if (probabilityInput.value === '') {
      probabilityInput.value = '100';
    }
  });

  probabilityRow.appendChild(probabilityLabel);
  probabilityRow.appendChild(probabilityInput);

  // Target form row
  const targetRow = document.createElement('div');
  targetRow.className = 'form-row';

  const targetLabel = document.createElement('label');
  targetLabel.textContent = 'Target text:';
  targetLabel.className = 'form-label';
  
  const targetInput = document.createElement('input');
  targetInput.type = 'text';
  targetInput.value = sub.target || '';
  targetInput.className = 'target-input';
  targetInput.required = true;
  targetInput.placeholder = 'Text to replace';

  targetRow.appendChild(targetLabel);
  targetRow.appendChild(targetInput);

  // Target error form row
  const targetErrorRow = document.createElement('div');
  targetErrorRow.className = 'form-row';

  const targetErrorLabel = document.createElement('label'); // Empty label for alignment
  targetErrorLabel.textContent = '';
  targetErrorLabel.className = 'form-label';

  const targetError = document.createElement('div');
  targetError.className = 'target-error';
  targetError.textContent = 'Target text is required.';
  targetError.style.display = 'none';

  targetErrorRow.appendChild(targetErrorLabel);
  targetErrorRow.appendChild(targetError);

  // Case-insensitive form row
  const caseRow = document.createElement('div');
  caseRow.className = 'form-row';

  const caseLabelText = document.createElement('label');
  caseLabelText.textContent = 'Case-insensitive:';
  caseLabelText.className = 'form-label';

  const caseCheckboxContainer = document.createElement('div');
  const caseCheckbox = document.createElement('input');
  caseCheckbox.type = 'checkbox';
  caseCheckbox.id = `case-${index}`;
  caseCheckbox.checked = sub.caseInsensitive || false;
  caseCheckbox.className = 'check-box';
  caseCheckboxContainer.appendChild(caseCheckbox);

  caseRow.appendChild(caseLabelText);
  caseRow.appendChild(caseCheckboxContainer);

  // Whole word form row
  const wholeWordRow = document.createElement('div');
  wholeWordRow.className = 'form-row';

  const wholeWordLabelText = document.createElement('label');
  wholeWordLabelText.textContent = 'Whole word only:';
  wholeWordLabelText.className = 'form-label';

  const wholeWordCheckboxContainer = document.createElement('div');
  const wholeWordCheckbox = document.createElement('input');
  wholeWordCheckbox.type = 'checkbox';
  wholeWordCheckbox.id = `whole-${index}`;
  wholeWordCheckbox.checked = sub.wholeWord || false;
  wholeWordCheckbox.className = 'check-box';
  wholeWordCheckboxContainer.appendChild(wholeWordCheckbox);

  wholeWordRow.appendChild(wholeWordLabelText);
  wholeWordRow.appendChild(wholeWordCheckboxContainer);

  // Replacements form area
  const replacementsLabel = document.createElement('label');
  replacementsLabel.textContent = 'Replacement options (one per line):';
  replacementsLabel.className = 'replacements-label';

  const replacementsTextarea = document.createElement('textarea');
  replacementsTextarea.value = (sub.replacements || []).join('\n');
  replacementsTextarea.className = 'replacements-textarea';
  replacementsTextarea.placeholder = 'Enter replacement options, one per line';

  const replacementsError = document.createElement('div');
  replacementsError.className = 'replacements-error';
  replacementsError.textContent = 'At least one replacement is required.';
  replacementsError.style.display = 'none';

  // Assemble content container
  contentContainer.appendChild(probabilityRow);
  contentContainer.appendChild(targetRow);
  contentContainer.appendChild(targetErrorRow);
  contentContainer.appendChild(caseRow);
  contentContainer.appendChild(wholeWordRow);
  contentContainer.appendChild(replacementsLabel);
  contentContainer.appendChild(replacementsTextarea);
  contentContainer.appendChild(replacementsError);

  container.dataset.index = index; // Used later for selection and identification
  container.updateData = () => {
    substitutions[index] = {
      probability: parseInt(probabilityInput.value) || 100,
      target: targetInput.value,
      caseInsensitive: caseCheckbox.checked,
      wholeWord: wholeWordCheckbox.checked,
      replacements: getReplacementArray(replacementsTextarea.value)
    };
  };

  return container;
};

const isValidSubstitution = (sub) => {
  if (isNaN(sub.probability) || sub.probability < 0 || sub.probability > 100) return false;
  if (!sub.target) return false;
  if (!Array.isArray(sub.replacements) || sub.replacements.length === 0) return false;
  return true;
};

const saveSubstitutions = () => {
  const subForms = document.querySelectorAll('[data-index]');
  let hasInvalidTarget = false;
  let hasInvalidReplacements = false;
  subForms.forEach((form) => {
    const targetInput = form.querySelector('.target-input');
    const targetError = form.querySelector('.target-error');
    const replacementsTextarea = form.querySelector('.replacements-textarea');
    const replacementsError = form.querySelector('.replacements-error');
    const contentContainer = form.querySelector('.sub-content');
    const headerToggle = form.querySelector('.sub-header-toggle');

    targetError.style.display = 'none';
    targetInput.classList.remove('input-error');
    replacementsError.style.display = 'none';
    replacementsTextarea.classList.remove('input-error');

    const isEmpty = targetInput.value.trim() === '';
    if (isEmpty) {
      hasInvalidTarget = true;
      targetInput.classList.add('input-error');
      targetError.style.display = 'block';
      contentContainer.style.display = 'block';
      headerToggle.textContent = expandedIcon;
    }

    if (replacementsTextarea) {
      const hasReplacement = getReplacementArray(replacementsTextarea.value).length > 0;
      if (!hasReplacement) {
        hasInvalidReplacements = true;
        replacementsTextarea.classList.add('input-error');
        replacementsError.style.display = 'block';
        contentContainer.style.display = 'block';
        headerToggle.textContent = expandedIcon;
      }
    }
  });

  if (hasInvalidTarget || hasInvalidReplacements) return;

  storeFormsData();

  const validSubstitutions = substitutions.filter((sub) => {
    return isValidSubstitution(sub);
  });

  if (validSubstitutions.length === 0) {
    alert('At least one substitution must have a target and at least one replacement.');
    return;
  }

  browserApi.storage.local.set({ li_rad_libs_subs: validSubstitutions }, () => {
    if (!saveMsg) return;
    if (saveMsgTimeoutId) clearTimeout(saveMsgTimeoutId);
    saveMsg.textContent = 'Saved';
    saveMsg.classList.add('visible');
    saveMsgTimeoutId = setTimeout(() => {
      saveMsg.classList.remove('visible');
      saveMsg.textContent = '';
    }, 1800);
    renderSubstitutions();
  });
};

addSubBtn.addEventListener('click', () => {
  storeFormsData(); // Store any unsaved changes before adding a new form
  substitutions.push({
    probability: 100,
    target: '',
    caseInsensitive: false,
    wholeWord: false,
    replacements: [],
  });
  renderSubstitutions();
});

saveBtn.addEventListener('click', () => {
  saveSubstitutions();
});

importBtn.addEventListener('click', () => {
  importInput.click();
});

importInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedSubs = JSON.parse(e.target.result);
      if (Array.isArray(importedSubs)) {
        //List of subs

        //Validate each substitution
        const validSubstitutions = importedSubs.filter((sub) => {
          return isValidSubstitution(sub);
        });
        if (validSubstitutions.length !== importedSubs.length) {
          alert('Some imported substitutions are invalid.');
          return;
        }
        substitutions = [...substitutions, ...validSubstitutions];
        renderSubstitutions();
      } else {
        //Single sub
        if (!isValidSubstitution(importedSubs)) {
          alert('The imported substitution is invalid.');
          return;
        }
        substitutions = [...substitutions, importedSubs];
        renderSubstitutions();
      }
    } catch (error) {
      alert('Error reading file.');
    }
  };
  reader.readAsText(file);
});

exportAllBtn.addEventListener('click', () => {
  exportObject(substitutions, 'lirl_all');
});

loadSubstitutionsAndRenderFromStorage();