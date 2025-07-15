let currentSheetIndex = 0;
let allSheets = JSON.parse(localStorage.getItem('sheets') || '[]');

const simpleFields = [
    'nombre', 'superior', 'cobertura',
    'fu', 'ag', 'ap', 'pr', 'vo', 'pe',
    'vida', 'mana', 'objetos', 'equipamiento'
];

const complexTables = [
    { id: 'armas', columns: 5 },
    { id: 'talentos', columns: 2 },
    { id: 'poderes', columns: 2 }
];

function getSheetKey(index) {
    return `sheet_${index}`;
}

function getCurrentSheet() {
    return JSON.parse(localStorage.getItem(getSheetKey(currentSheetIndex)) || '{}');
}

function saveCurrentSheet() {
    const data = {};
    simpleFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) data[id] = el.value || '';
    });

    complexTables.forEach(({ id, columns }) => {
        const tbody = document.getElementById(id);
        const rows = [];
        if (!tbody) return;
        for (let i = 0; i < tbody.rows.length; i += 2) {
            const dataRow = tbody.rows[i];
            const noteRow = tbody.rows[i + 1];

            if (!dataRow || !noteRow) continue;

            const rowData = [];
            for (let c = 0; c < columns; c++) {
                const cell = dataRow.cells[c];
                const input = cell.querySelector('input');
                rowData.push(input ? input.value : cell.textContent.trim());
            }
            let nota = '';
            const textarea = noteRow.querySelector('textarea');
            if (textarea) {
                nota = textarea.value;
            } else {
                // Buscar el valor de la nota en modo read-only
                const strong = noteRow.querySelector('strong');
                nota = strong ? noteRow.textContent.replace('📝 Notas:', '').trim() : '';
            }
            rowData.push(nota);
            rows.push(rowData);
        }
        data[id] = rows;
    });

    localStorage.setItem(getSheetKey(currentSheetIndex), JSON.stringify(data));
    const nombre = data.nombre?.trim();
    allSheets[currentSheetIndex].name = nombre || `Personaje #${currentSheetIndex + 1}`;
    localStorage.setItem('sheets', JSON.stringify(allSheets));
}

function loadSheet(index) {
    currentSheetIndex = index;
    const data = getCurrentSheet();

    simpleFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = data[id] || '';
    });

    complexTables.forEach(({ id, columns }) => {
        const tbody = document.getElementById(id);
        if (!tbody) return;
        tbody.innerHTML = '';
        (data[id] || []).forEach(row => {
            addExpandableRowEditable(id, columns, row, false);
        });
    });

    updateStatSummary();
}

function renderSheetSelector() {
    const select = document.getElementById('characterSelector');
    if (!select) return;

    select.innerHTML = '';
    allSheets.forEach((s, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        const savedData = JSON.parse(localStorage.getItem(getSheetKey(i)) || '{}');
        const nombre = savedData.nombre?.trim() || s.name || `Personaje #${i + 1}`;
        opt.textContent = nombre;
        if (i === currentSheetIndex) opt.selected = true;
        select.appendChild(opt);
    });

    const deleteBtn = document.getElementById('deleteCharacterBtn');
    if (deleteBtn) deleteBtn.style.display = allSheets.length > 1 ? '' : 'none';
}

function resetSheet() {
    if (confirm('¿Seguro que querés resetear esta hoja?')) {
        localStorage.removeItem(getSheetKey(currentSheetIndex));
        loadSheet(currentSheetIndex);
    }
}

function deleteCurrentSheet() {
    if (allSheets.length <= 1) return;
    if (!confirm('¿Eliminar este personaje definitivamente?')) return;
    allSheets.splice(currentSheetIndex, 1);
    localStorage.setItem('sheets', JSON.stringify(allSheets));
    localStorage.removeItem(getSheetKey(currentSheetIndex));
    for (let i = currentSheetIndex; i < allSheets.length; i++) {
        const next = localStorage.getItem(getSheetKey(i + 1));
        if (next) {
            localStorage.setItem(getSheetKey(i), next);
            localStorage.removeItem(getSheetKey(i + 1));
        }
    }
    currentSheetIndex = 0;
    renderSheetSelector();
    loadSheet(0);
}

function updateStatSummary() {
    const val = id => {
        const el = document.getElementById(id);
        return el ? parseInt(el.value || 0, 10) || 0 : 0;
    };
    const raw = id => {
        const el = document.getElementById(id);
        return el ? el.value.trim() || '-' : '-';
    };

    const ids = ['fu', 'ag', 'ap', 'pr', 'vo', 'pe', 'vida', 'mana'];
    ids.forEach(stat => {
        const target = document.getElementById(`sum-${stat}`);
        if (target) {
            target.textContent = ['vida', 'mana'].includes(stat) ? raw(stat) : val(stat);
        }
    });
}

function toggleStatSummaryVisibility() {
    const summary = document.getElementById('stat-summary');
    const statsSection = document.querySelector('.row-cols-2.row-cols-md-6');
    if (!statsSection || !summary) return;
    const rect = statsSection.getBoundingClientRect();
    const visible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    summary.style.display = visible ? 'none' : 'flex';
}

function addExpandableRowEditable(tableId, cols, rowData = [], startEditable = true) {
    const tbody = document.getElementById(tableId);
    const index = tbody.rows.length / 2;
    const inputs = [];

    let editable = startEditable;
    // === FILA PRINCIPAL ===
    const mainRow = tbody.insertRow();
    for (let c = 0; c < cols; c++) {
        const rowValue = rowData[c] || '';
        const cell = mainRow.insertCell();

        const input = document.createElement('input');
        input.className = 'form-control';
        input.value = rowValue;
        inputs.push({ input, cell });
        if (editable) {
            input.addEventListener('input', saveCurrentSheet);
            cell.appendChild(input);
        }
        else {
            cell.innerHTML = rowValue;
        }
    }

    const toggleCell = mainRow.insertCell();
    const icon = document.createElement('i');
    icon.className = 'bi bi-chevron-down';
    icon.style.cursor = 'pointer';
    toggleCell.appendChild(icon);

    // === FILA DE NOTAS ===
    const noteRow = tbody.insertRow();
    noteRow.style.display = 'none';

    const noteCell = noteRow.insertCell();
    noteCell.colSpan = cols;

    const label = document.createElement('label');
    label.textContent = '📝 Notas';
    const textarea = document.createElement('textarea');
    textarea.className = 'form-control mt-1';
    textarea.rows = 2;
    textarea.style.resize = 'vertical';
    textarea.value = rowData[cols] || '';
    textarea.addEventListener('input', saveCurrentSheet);

    if (editable) {
        textarea.disabled = false;
        noteCell.innerHTML = '';
        noteCell.appendChild(label);
        noteCell.appendChild(textarea);
    } else {
        textarea.disabled = true;
        noteCell.innerHTML = `<strong>📝 Notas:</strong><br>${textarea.value}`;
    }

    const actionCell = noteRow.insertCell();
    actionCell.className = 'text-end align-top';

    const trashBtn = document.createElement('button');
    trashBtn.type = 'button';
    trashBtn.className = 'btn btn-sm btn-danger mt-2';
    trashBtn.innerHTML = '<i class="bi bi-trash"></i>';
    trashBtn.onclick = () => {
        tbody.removeChild(mainRow);
        tbody.removeChild(noteRow);
        saveCurrentSheet();
    };

    const toggleEditBtn = document.createElement('button');
    toggleEditBtn.type = 'button';

    toggleEditBtn.className = 'btn btn-sm ' + (editable ? 'btn-success' : 'btn-primary') + ' mt-2';
    toggleEditBtn.innerHTML = editable
        ? '<i class="bi bi-save"></i>'
        : '<i class="bi bi-pencil"></i>';


    function setEditMode(state) {
        editable = state;
        toggleEditBtn.className = 'btn btn-sm ' + (editable ? 'btn-success' : 'btn-primary') + ' mt-2';
        toggleEditBtn.innerHTML = editable
            ? '<i class="bi bi-save"></i>'
            : '<i class="bi bi-pencil"></i>';

        inputs.forEach((item, idx) => {
            const { input, cell } = item;
            if (editable) {
                const newInput = document.createElement('input');
                newInput.className = 'form-control';
                newInput.value = input.value;
                newInput.addEventListener('input', saveCurrentSheet);
                inputs[idx].input = newInput;
                cell.innerHTML = '';
                cell.appendChild(newInput);
            } else {
                const val = input.value;
                cell.innerHTML = val;
            }
        });

        if (editable) {
            textarea.disabled = false;
            noteCell.innerHTML = '';
            noteCell.appendChild(label);
            noteCell.appendChild(textarea);
        } else {
            textarea.disabled = true;
            noteCell.innerHTML = `<strong>📝 Notas:</strong><br>${textarea.value}`;
        }

        const btnContainer = document.createElement('div');
        btnContainer.className = 'd-flex flex-column align-items-center justify-content-center gap-1 mt-2';
        btnContainer.appendChild(toggleEditBtn);
        btnContainer.appendChild(trashBtn);

        actionCell.innerHTML = '';
        actionCell.appendChild(btnContainer);
    }

    toggleEditBtn.onclick = () => {
        setEditMode(!editable);
        // saveCurrentSheet();
    };

    icon.addEventListener('click', () => {
        const isOpen = noteRow.style.display === 'table-row';
        noteRow.style.display = isOpen ? 'none' : 'table-row';
        icon.className = isOpen ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
    });

    const btnContainer = document.createElement('div');
    btnContainer.className = 'd-flex flex-column align-items-center justify-content-center gap-1 mt-2';
    btnContainer.appendChild(toggleEditBtn);
    btnContainer.appendChild(trashBtn);

    actionCell.innerHTML = '';
    actionCell.appendChild(btnContainer);
}

// === EVENTOS ===
window.addEventListener('DOMContentLoaded', () => {
    if (allSheets.length === 0) {
        allSheets.push({ name: 'Personaje #1' });
        localStorage.setItem('sheets', JSON.stringify(allSheets));
    }
    loadSheet(0);
    renderSheetSelector();

    document.getElementById('newCharacterBtn')?.addEventListener('click', () => {
        saveCurrentSheet();
        allSheets.push({ name: `Personaje #${allSheets.length + 1}` });
        localStorage.setItem('sheets', JSON.stringify(allSheets));
        currentSheetIndex = allSheets.length - 1;
        loadSheet(currentSheetIndex);
        renderSheetSelector();
    });

    document.getElementById('characterSelector')?.addEventListener('change', e => {
        saveCurrentSheet();
        loadSheet(e.target.value);
    });

    simpleFields.forEach(id => {
        document.getElementById(id)?.addEventListener('input', saveCurrentSheet);
        if (['fu', 'ag', 'ap', 'pr', 'vo', 'pe', 'vida', 'mana'].includes(id)) {
            document.getElementById(id)?.addEventListener('input', updateStatSummary);
        }
    });

    document.getElementById('nombre')?.addEventListener('input', () => {
        const nombre = document.getElementById('nombre')?.value.trim();
        allSheets[currentSheetIndex].name = nombre || `Personaje #${currentSheetIndex + 1}`;
        localStorage.setItem('sheets', JSON.stringify(allSheets));
        renderSheetSelector();
    });

    window.addEventListener('scroll', toggleStatSummaryVisibility);
    window.addEventListener('resize', toggleStatSummaryVisibility);

    // Agregar eventos a los botones de agregar filas
    [
        { btnId: 'add-arma', tableId: 'armas', cols: 5 },
        { btnId: 'add-talento', tableId: 'talentos', cols: 2 },
        { btnId: 'add-poder', tableId: 'poderes', cols: 2 },
    ].forEach(({ btnId, tableId, cols }) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                addExpandableRowEditable(tableId, cols);
            });
        }
    });

});
