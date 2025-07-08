const API_BASE = 'https://script.google.com/macros/s/AKfycbwhDtFSlkxERwc5sxesB5toeQVkh8D9xjI2ezDoOE_H35vbqxHrMrmcFeHrYvS6Sehw/exec';

let userEmail = ''; // This variable will be set from sessionStorage

function getShortName(email) {
  return email.split('@')[0];
}

function getEmailColorClass(email) {
  const key = email.toLowerCase();
  const colorMap = {
    "aniket@gmail.com": "card-aniket",
    "pc01@ntwoods.com": "card-mis",
    "dinesh@gmail.com": "card-dinesh",
    "cleaning@gmail.com": "card-cleaning",
    "accounts@ntwoods.com": "card-accounts"
    // Add more mappings as needed
  };
  return colorMap[key] || "card-default"; // Fallback class
}

async function initializePerformancePage() {
  userEmail = sessionStorage.getItem('userEmail');
  const userName = sessionStorage.getItem('userName');

  if (!userEmail) {
    window.location.href = 'portal.html';
    return;
  }

  document.getElementById('userName').textContent = userName || 'User';

  showLoader();
  await loadTasks(userEmail);
  await loadPerformance(userEmail);
  hideLoader();
}

async function loadTasks(email) {
  try {
    const res = await fetch(`${API_BASE}?action=getUserTasks&email=${email}`);
    const result = await res.json();

    if (result.status !== 'success') {
      console.error('Failed to load tasks:', result.message);
      showToast(`Failed to load tasks: ${result.message}`, 'error');
      return;
    }

    const container = document.getElementById('taskList');
    container.innerHTML = '';

    result.tasks.forEach(task => {
      const taskCard = document.createElement('div');

      const statusColorClass =
        task.Status === 'On Time' ? 'status-on-time' :
        task.Status === 'Late' ? 'status-late' :
        'status-pending';

      const plannedDate = new Date(task['Planned Date']);
      const formattedPlannedDate = plannedDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/ /g, '-');

      const assignedShort = getShortName(task['Assigned To']);
      const emailColorClass = getEmailColorClass(task['Assigned To']);

      taskCard.className = `task-card ${emailColorClass}`;

      taskCard.innerHTML = `
        <h3 class="text-lg font-semibold mb-1">${task.Task}</h3>
        <p><strong>Planned:</strong> ${formattedPlannedDate}</p>
        <p><strong>Assigned To:</strong> ${assignedShort}</p>
        <p><strong>Status:</strong> <span class="${statusColorClass}">${task.Status}</span></p>
        ${task.Status === 'Pending' ? `<button class="btn btn-mark-done"
          data-taskid="${task['Task ID']}"
          data-date="${task['Planned Date']}"><i class="fas fa-check fa-icon"></i> Mark Done</button>` : ''}
      `;

      container.appendChild(taskCard);
    });

    document.querySelectorAll('.btn-mark-done').forEach(btn => {
      btn.addEventListener('click', async () => {
        const taskID = btn.dataset.taskid;
        const date = btn.dataset.date;
        showCustomModal(
            'Confirm Task Completion',
            `Are you sure you want to mark "${taskID}" as done?`,
            [
                { text: 'Cancel', className: 'btn btn-danger', onClick: () => console.log('Cancelled') },
                { text: 'Confirm', className: 'btn btn-success', onClick: () => markTaskAsDone(taskID, date) }
            ]
        );
      });
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
    showToast('An error occurred while loading tasks.', 'error');
  }
}

async function loadPerformance(email) {
  try {
    const res = await fetch(`${API_BASE}?action=getMyPerformance&email=${email}`);
    const data = await res.json();

    if (data.status !== 'success') {
      console.error('Failed to load performance data:', data.message);
      showToast(`Failed to load performance: ${data.message}`, 'error');
      return;
    }

    document.getElementById('total').textContent = data.total;
    document.getElementById('onTime').textContent = data.onTime;
    document.getElementById('late').textContent = data.late;
    document.getElementById('pending').textContent = data.pending;
    document.getElementById('targetPercent').textContent = data.targetPercent;
    document.getElementById('achieved').textContent = data.achieved;

    const statusMessageElement = document.getElementById('statusMessage');
    statusMessageElement.classList.remove('status-on-time', 'status-late', 'status-pending');

    if (data.achieved >= data.target) {
      statusMessageElement.textContent = "✅ Target Achieved!";
      statusMessageElement.classList.add('status-on-time');
    } else {
      statusMessageElement.textContent = "⚠️ Below Target";
      statusMessageElement.classList.add('status-late');
    }
  } catch (error) {
    console.error('Error loading performance:', error);
    showToast('An error occurred while loading performance data.', 'error');
  }
}

async function markTaskAsDone(taskID, date) {
  showLoader();
  try {
    const params = new URLSearchParams({
      action: 'markTaskDone',
      email: userEmail,
      taskID: taskID,
      plannedDate: date
    });

    const res = await fetch(API_BASE, {
      method: 'POST',
      body: params
    });

    const result = await res.json();
    if (result.status === 'success') {
      showToast('Task marked as done!', 'success');
      await loadTasks(userEmail);
      await loadPerformance(userEmail);
    } else {
      console.error('Failed to mark task done:', result.message);
      showToast(`Failed to mark task done: ${result.message}`, 'error');
    }
  } catch (error) {
    console.error('Error marking task done:', error);
    showToast('An error occurred while marking the task done.', 'error');
  } finally {
    hideLoader();
  }
}
