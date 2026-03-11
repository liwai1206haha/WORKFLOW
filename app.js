const app = {
  tasks: [],
  reviews: [],
  notes: [],
  currentFilter: 'all',
  calendarDate: new Date(),

  // ==================== 初始化 ====================
  async init() {
    await this.loadData();
    this.bindEvents();
    this.renderTasks();
    this.renderCalendar();
    this.renderReviews();
    this.renderStats();
    this.renderNotes();
    document.getElementById('reviewDate').valueAsDate = new Date();
    document.getElementById('taskStartDate').valueAsDate = new Date();
  },

  async loadData() {
    // 优先从后端加载数据
    try {
      const resp = await fetch('/api/data');
      if (resp.ok) {
        const data = await resp.json();
        this.tasks = data.tasks || [];
        this.reviews = data.reviews || [];
        this.notes = data.notes || [];
        // 同步到 localStorage 作为备份
        localStorage.setItem('wf_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('wf_reviews', JSON.stringify(this.reviews));
        localStorage.setItem('wf_notes', JSON.stringify(this.notes));
        return;
      }
    } catch (e) {
      console.warn('后端未连接，使用本地数据:', e.message);
    }
    // 后端不可用时从 localStorage 加载
    this.tasks = JSON.parse(localStorage.getItem('wf_tasks') || '[]');
    this.reviews = JSON.parse(localStorage.getItem('wf_reviews') || '[]');
    this.notes = JSON.parse(localStorage.getItem('wf_notes') || '[]');
  },

  saveData() {
    // 同步保存到 localStorage
    localStorage.setItem('wf_tasks', JSON.stringify(this.tasks));
    localStorage.setItem('wf_reviews', JSON.stringify(this.reviews));
    localStorage.setItem('wf_notes', JSON.stringify(this.notes));
    // 异步保存到后端文件
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: this.tasks, reviews: this.reviews, notes: this.notes }),
    }).catch(e => console.warn('后端保存失败:', e.message));
  },

  // ==================== 事件绑定 ====================
  bindEvents() {
    // 导航切换
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        const tab = item.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        if (tab === 'schedule') this.renderCalendar();
        if (tab === 'stats') this.renderStats();
      });
    });

    // 筛选按钮
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderTasks();
      });
    });

    // 评分滑块
    document.getElementById('reviewRating').addEventListener('input', (e) => {
      document.getElementById('ratingValue').textContent = e.target.value;
    });

    // ESC关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeTaskModal();
        this.closeReviewModal();
        this.closeTaskDetail();
        this.closeNoteModal();
        this.closeNoteDetail();
      }
    });

    // 点击遮罩关闭弹窗
    ['taskModal', 'reviewModal', 'taskDetailModal', 'noteModal', 'noteDetailModal'].forEach(id => {
      document.getElementById(id).addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
          e.target.classList.remove('show');
        }
      });
    });
  },

  // ==================== 事务管理 ====================
  openTaskModal(taskId) {
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskModalTitle');
    if (taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) return;
      title.textContent = '编辑事务';
      document.getElementById('taskId').value = task.id;
      document.getElementById('taskName').value = task.name;
      document.getElementById('taskStatus').value = task.status;
      document.getElementById('taskPriority').value = task.priority;
      document.getElementById('taskStartDate').value = task.startDate || '';
      document.getElementById('taskEndDate').value = task.endDate || '';
      document.getElementById('taskTags').value = (task.tags || []).join(', ');
      document.getElementById('taskDesc').value = task.desc || '';
    } else {
      title.textContent = '新建事务';
      document.getElementById('taskId').value = '';
      document.getElementById('taskName').value = '';
      document.getElementById('taskStatus').value = 'todo';
      document.getElementById('taskPriority').value = 'medium';
      document.getElementById('taskStartDate').valueAsDate = new Date();
      document.getElementById('taskEndDate').value = '';
      document.getElementById('taskTags').value = '';
      document.getElementById('taskDesc').value = '';
    }
    modal.classList.add('show');
    setTimeout(() => document.getElementById('taskName').focus(), 100);
  },

  closeTaskModal() {
    document.getElementById('taskModal').classList.remove('show');
  },

  saveTask() {
    const name = document.getElementById('taskName').value.trim();
    if (!name) {
      this.toast('请输入事务名称', 'warning');
      return;
    }

    const id = document.getElementById('taskId').value;
    const taskData = {
      name,
      status: document.getElementById('taskStatus').value,
      priority: document.getElementById('taskPriority').value,
      startDate: document.getElementById('taskStartDate').value,
      endDate: document.getElementById('taskEndDate').value,
      tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(Boolean),
      desc: document.getElementById('taskDesc').value.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (id) {
      const idx = this.tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        this.tasks[idx] = { ...this.tasks[idx], ...taskData };
        if (taskData.status === 'done' && !this.tasks[idx].completedAt) {
          this.tasks[idx].completedAt = new Date().toISOString();
        }
        this.toast('事务已更新', 'success');
      }
    } else {
      taskData.id = this.genId();
      taskData.createdAt = new Date().toISOString();
      this.tasks.unshift(taskData);
      this.toast('事务已创建', 'success');
    }

    this.saveData();
    this.renderTasks();
    this.renderCalendar();
    this.renderStats();
    this.closeTaskModal();
  },

  deleteTask(id) {
    if (!confirm('确定删除该事务吗？')) return;
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveData();
    this.renderTasks();
    this.renderCalendar();
    this.renderStats();
    this.closeTaskDetail();
    this.toast('事务已删除', 'success');
  },

  changeStatus(id, status) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      task.updatedAt = new Date().toISOString();
      if (status === 'done') task.completedAt = new Date().toISOString();
      this.saveData();
      this.renderTasks();
      this.renderCalendar();
      this.renderStats();
    }
  },

  filterTasks() {
    this.renderTasks();
  },

  getFilteredTasks() {
    const search = document.getElementById('taskSearch').value.toLowerCase();
    return this.tasks.filter(t => {
      const matchFilter = this.currentFilter === 'all' || t.status === this.currentFilter;
      const matchSearch = !search || t.name.toLowerCase().includes(search)
        || (t.desc || '').toLowerCase().includes(search)
        || (t.tags || []).some(tag => tag.toLowerCase().includes(search));
      return matchFilter && matchSearch;
    });
  },

  // ==================== 渲染事务看板 ====================
  renderTasks() {
    const statuses = ['todo', 'in-progress', 'done', 'blocked'];
    const filtered = this.getFilteredTasks();

    statuses.forEach(status => {
      const col = document.getElementById('col-' + status);
      const items = filtered.filter(t => t.status === status);
      const count = document.getElementById('count-' + status);
      count.textContent = items.length;

      if (items.length === 0) {
        col.innerHTML = `<div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          <p>暂无事务</p></div>`;
        return;
      }

      col.innerHTML = items.map(task => this.renderTaskCard(task)).join('');
    });
  },

  renderTaskCard(task) {
    const isOverdue = task.endDate && new Date(task.endDate) < new Date() && task.status !== 'done';
    const dateStr = task.endDate ? this.formatDate(task.endDate) : '';
    const tags = (task.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('');
    const nextStatuses = this.getNextStatuses(task.status);
    const actionBtns = nextStatuses.map(s =>
      `<button onclick="event.stopPropagation(); app.changeStatus('${task.id}','${s.value}')">${s.label}</button>`
    ).join('');

    return `<div class="task-card" onclick="app.showTaskDetail('${task.id}')">
      <div class="card-priority priority-${task.priority}"></div>
      <div class="card-title">${this.esc(task.name)}</div>
      ${task.desc ? `<div class="card-desc">${this.esc(task.desc)}</div>` : ''}
      <div class="card-meta">
        <div class="card-tags">${tags}</div>
        ${dateStr ? `<div class="card-date${isOverdue ? ' overdue' : ''}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${dateStr}</div>` : ''}
      </div>
      ${actionBtns ? `<div class="card-actions">${actionBtns}</div>` : ''}
    </div>`;
  },

  getNextStatuses(current) {
    const map = {
      'todo': [{ value: 'in-progress', label: '开始' }],
      'in-progress': [{ value: 'done', label: '完成' }, { value: 'blocked', label: '阻塞' }],
      'blocked': [{ value: 'in-progress', label: '恢复' }],
      'done': [],
    };
    return map[current] || [];
  },

  // ==================== 事务详情 ====================
  showTaskDetail(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    const statusLabels = { 'todo': '待办', 'in-progress': '进行中', 'done': '已完成', 'blocked': '已阻塞' };
    const priorityLabels = { 'low': '低', 'medium': '中', 'high': '高', 'urgent': '紧急' };
    const tags = (task.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('') || '-';

    document.getElementById('taskDetailBody').innerHTML = `
      <div class="detail-row"><span class="detail-label">名称</span><span class="detail-value">${this.esc(task.name)}</span></div>
      <div class="detail-row"><span class="detail-label">状态</span><span class="detail-value"><span class="status-badge status-${task.status}">${statusLabels[task.status]}</span></span></div>
      <div class="detail-row"><span class="detail-label">优先级</span><span class="detail-value"><span class="priority-badge ${task.priority}">${priorityLabels[task.priority]}</span></span></div>
      <div class="detail-row"><span class="detail-label">开始日期</span><span class="detail-value">${task.startDate || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">截止日期</span><span class="detail-value">${task.endDate || '-'}</span></div>
      <div class="detail-row"><span class="detail-label">标签</span><span class="detail-value">${tags}</span></div>
      <div class="detail-row"><span class="detail-label">描述</span><span class="detail-value">${this.esc(task.desc || '-')}</span></div>
      <div class="detail-row"><span class="detail-label">创建时间</span><span class="detail-value">${this.formatDateTime(task.createdAt)}</span></div>
      <div class="detail-row"><span class="detail-label">更新时间</span><span class="detail-value">${this.formatDateTime(task.updatedAt)}</span></div>
    `;

    document.getElementById('editTaskBtn').onclick = () => {
      this.closeTaskDetail();
      this.openTaskModal(id);
    };
    document.getElementById('deleteTaskBtn').onclick = () => this.deleteTask(id);
    document.getElementById('taskDetailModal').classList.add('show');
  },

  closeTaskDetail() {
    document.getElementById('taskDetailModal').classList.remove('show');
  },

  // ==================== 日历 ====================
  renderCalendar() {
    const d = this.calendarDate;
    const year = d.getFullYear();
    const month = d.getMonth();
    document.getElementById('currentMonth').textContent = `${year}年${month + 1}月`;

    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // 周一开始
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayStr = this.dateStr(today);

    let html = '';
    // 上月补全
    for (let i = startDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const dateStr = this.dateStr(new Date(year, month - 1, day));
      const events = this.getTasksForDate(dateStr);
      html += this.renderCalDay(day, dateStr, true, false, events);
    }
    // 当月
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = this.dateStr(new Date(year, month, day));
      const isToday = dateStr === todayStr;
      const events = this.getTasksForDate(dateStr);
      html += this.renderCalDay(day, dateStr, false, isToday, events);
    }
    // 下月补全
    const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
    const remaining = totalCells - (startDay + daysInMonth);
    for (let day = 1; day <= remaining; day++) {
      const dateStr = this.dateStr(new Date(year, month + 1, day));
      const events = this.getTasksForDate(dateStr);
      html += this.renderCalDay(day, dateStr, true, false, events);
    }

    document.getElementById('calendarGrid').innerHTML = html;
  },

  renderCalDay(day, dateStr, isOther, isToday, events) {
    const cls = ['cal-day'];
    if (isOther) cls.push('other-month');
    if (isToday) cls.push('today');

    const maxShow = 3;
    const eventsHtml = events.slice(0, maxShow).map(t =>
      `<div class="day-event status-${t.status}" onclick="event.stopPropagation(); app.showTaskDetail('${t.id}')" title="${this.esc(t.name)}">${this.esc(t.name)}</div>`
    ).join('');
    const moreHtml = events.length > maxShow
      ? `<div class="day-event-more">+${events.length - maxShow} 更多</div>` : '';

    return `<div class="${cls.join(' ')}" onclick="app.openTaskModalWithDate('${dateStr}')">
      <div class="day-number">${day}</div>
      <div class="day-events">${eventsHtml}${moreHtml}</div>
    </div>`;
  },

  getTasksForDate(dateStr) {
    return this.tasks.filter(t => {
      if (t.startDate === dateStr || t.endDate === dateStr) return true;
      if (t.startDate && t.endDate && t.startDate <= dateStr && t.endDate >= dateStr) return true;
      return false;
    });
  },

  openTaskModalWithDate(dateStr) {
    this.openTaskModal();
    document.getElementById('taskStartDate').value = dateStr;
  },

  prevMonth() {
    this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
    this.renderCalendar();
  },

  nextMonth() {
    this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
    this.renderCalendar();
  },

  goToday() {
    this.calendarDate = new Date();
    this.renderCalendar();
  },

  // ==================== 复盘 ====================
  openReviewModal(reviewId) {
    const modal = document.getElementById('reviewModal');
    const title = document.getElementById('reviewModalTitle');
    if (reviewId) {
      const review = this.reviews.find(r => r.id === reviewId);
      if (!review) return;
      title.textContent = '编辑复盘';
      document.getElementById('reviewId').value = review.id;
      document.getElementById('reviewType').value = review.type;
      document.getElementById('reviewDate').value = review.date;
      document.getElementById('reviewTitle').value = review.title;
      document.getElementById('reviewDone').value = review.done || '';
      document.getElementById('reviewProblems').value = review.problems || '';
      document.getElementById('reviewLessons').value = review.lessons || '';
      document.getElementById('reviewPlan').value = review.plan || '';
      document.getElementById('reviewRating').value = review.rating || 3;
      document.getElementById('ratingValue').textContent = review.rating || 3;
    } else {
      title.textContent = '新建复盘';
      document.getElementById('reviewId').value = '';
      document.getElementById('reviewType').value = 'daily';
      document.getElementById('reviewDate').valueAsDate = new Date();
      document.getElementById('reviewTitle').value = '';
      document.getElementById('reviewDone').value = '';
      document.getElementById('reviewProblems').value = '';
      document.getElementById('reviewLessons').value = '';
      document.getElementById('reviewPlan').value = '';
      document.getElementById('reviewRating').value = 3;
      document.getElementById('ratingValue').textContent = 3;
    }
    modal.classList.add('show');
    setTimeout(() => document.getElementById('reviewTitle').focus(), 100);
  },

  closeReviewModal() {
    document.getElementById('reviewModal').classList.remove('show');
  },

  saveReview() {
    const title = document.getElementById('reviewTitle').value.trim();
    if (!title) {
      this.toast('请输入复盘标题', 'warning');
      return;
    }

    const id = document.getElementById('reviewId').value;
    const reviewData = {
      type: document.getElementById('reviewType').value,
      date: document.getElementById('reviewDate').value,
      title,
      done: document.getElementById('reviewDone').value.trim(),
      problems: document.getElementById('reviewProblems').value.trim(),
      lessons: document.getElementById('reviewLessons').value.trim(),
      plan: document.getElementById('reviewPlan').value.trim(),
      rating: parseInt(document.getElementById('reviewRating').value),
      updatedAt: new Date().toISOString(),
    };

    if (id) {
      const idx = this.reviews.findIndex(r => r.id === id);
      if (idx !== -1) {
        this.reviews[idx] = { ...this.reviews[idx], ...reviewData };
        this.toast('复盘已更新', 'success');
      }
    } else {
      reviewData.id = this.genId();
      reviewData.createdAt = new Date().toISOString();
      this.reviews.unshift(reviewData);
      this.toast('复盘已创建', 'success');
    }

    this.saveData();
    this.renderReviews();
    this.closeReviewModal();
  },

  deleteReview(id) {
    if (!confirm('确定删除该复盘记录吗？')) return;
    this.reviews = this.reviews.filter(r => r.id !== id);
    this.saveData();
    this.renderReviews();
    this.toast('复盘已删除', 'success');
  },

  renderReviews() {
    const filter = document.getElementById('reviewTypeFilter').value;
    const list = this.reviews.filter(r => filter === 'all' || r.type === filter);
    const container = document.getElementById('reviewList');

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>暂无复盘记录，点击"新建复盘"开始</p></div>`;
      return;
    }

    const typeLabels = { daily: '日复盘', weekly: '周复盘', monthly: '月复盘', project: '项目复盘' };

    container.innerHTML = list.map(r => {
      const stars = Array.from({ length: 5 }, (_, i) =>
        `<span class="star${i < r.rating ? ' filled' : ''}">★</span>`
      ).join('');

      return `<div class="review-card">
        <div class="review-card-header">
          <span class="review-type-badge badge-${r.type}">${typeLabels[r.type]}</span>
          <span class="review-date">${r.date}</span>
        </div>
        <div class="review-card-title">${this.esc(r.title)}</div>
        ${r.done ? `<div class="review-card-section"><h4>完成工作</h4><p>${this.esc(r.done)}</p></div>` : ''}
        ${r.problems ? `<div class="review-card-section"><h4>遇到问题</h4><p>${this.esc(r.problems)}</p></div>` : ''}
        ${r.lessons ? `<div class="review-card-section"><h4>经验教训</h4><p>${this.esc(r.lessons)}</p></div>` : ''}
        <div class="review-rating">${stars}</div>
        <div class="review-card-actions">
          <button onclick="event.stopPropagation(); app.openReviewModal('${r.id}')">编辑</button>
          <button class="delete-btn" onclick="event.stopPropagation(); app.deleteReview('${r.id}')">删除</button>
        </div>
      </div>`;
    }).join('');
  },

  // ==================== 数据统计 ====================
  renderStats() {
    const total = this.tasks.length;
    const done = this.tasks.filter(t => t.status === 'done').length;
    const progress = this.tasks.filter(t => t.status === 'in-progress').length;
    const rate = total ? Math.round((done / total) * 100) : 0;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statDone').textContent = done;
    document.getElementById('statProgress').textContent = progress;
    document.getElementById('statRate').textContent = rate + '%';

    this.renderStatusChart();
    this.renderPriorityChart();
    this.renderTrendChart();
  },

  renderStatusChart() {
    const data = [
      { label: '待办', count: this.tasks.filter(t => t.status === 'todo').length, color: '#3b82f6' },
      { label: '进行中', count: this.tasks.filter(t => t.status === 'in-progress').length, color: '#f59e0b' },
      { label: '已完成', count: this.tasks.filter(t => t.status === 'done').length, color: '#22c55e' },
      { label: '已阻塞', count: this.tasks.filter(t => t.status === 'blocked').length, color: '#a855f7' },
    ];
    const total = data.reduce((s, d) => s + d.count, 0);
    const container = document.getElementById('statusChart');

    if (total === 0) {
      container.innerHTML = '<div class="empty-state"><p>暂无数据</p></div>';
      return;
    }

    let cumulativePercent = 0;
    const segments = data.filter(d => d.count > 0).map(d => {
      const percent = (d.count / total) * 100;
      const startAngle = cumulativePercent * 3.6;
      const endAngle = (cumulativePercent + percent) * 3.6;
      cumulativePercent += percent;
      return { ...d, percent, startAngle, endAngle };
    });

    // SVG 饼图
    let pathsHtml = '';
    let currentAngle = -90;
    segments.forEach(seg => {
      const angle = (seg.count / total) * 360;
      const endAngle = currentAngle + angle;
      const largeArc = angle > 180 ? 1 : 0;
      const x1 = 80 + 70 * Math.cos((currentAngle * Math.PI) / 180);
      const y1 = 80 + 70 * Math.sin((currentAngle * Math.PI) / 180);
      const x2 = 80 + 70 * Math.cos((endAngle * Math.PI) / 180);
      const y2 = 80 + 70 * Math.sin((endAngle * Math.PI) / 180);
      pathsHtml += `<path d="M80,80 L${x1},${y1} A70,70 0 ${largeArc},1 ${x2},${y2} Z" fill="${seg.color}" opacity="0.85"/>`;
      currentAngle = endAngle;
    });

    const legendHtml = data.map(d =>
      `<div class="legend-item"><span class="legend-dot" style="background:${d.color}"></span>${d.label}: ${d.count}</div>`
    ).join('');

    container.innerHTML = `<div class="pie-chart">
      <svg class="pie-svg" viewBox="0 0 160 160">${pathsHtml}</svg>
      <div class="pie-legend">${legendHtml}</div>
    </div>`;
  },

  renderPriorityChart() {
    const data = [
      { label: '低', count: this.tasks.filter(t => t.priority === 'low').length, color: '#3b82f6' },
      { label: '中', count: this.tasks.filter(t => t.priority === 'medium').length, color: '#22c55e' },
      { label: '高', count: this.tasks.filter(t => t.priority === 'high').length, color: '#f59e0b' },
      { label: '紧急', count: this.tasks.filter(t => t.priority === 'urgent').length, color: '#ef4444' },
    ];
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const container = document.getElementById('priorityChart');

    if (this.tasks.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>暂无数据</p></div>';
      return;
    }

    container.innerHTML = `<div class="bar-chart">${data.map(d => {
      const h = Math.max((d.count / maxCount) * 160, 4);
      return `<div class="bar-item">
        <div class="bar" style="height:${h}px; background:${d.color}"><span class="bar-value">${d.count}</span></div>
        <span class="bar-label">${d.label}</span>
      </div>`;
    }).join('')}</div>`;
  },

  renderTrendChart() {
    const container = document.getElementById('trendChart');
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(this.dateStr(d));
    }

    const counts = days.map(day => {
      return this.tasks.filter(t =>
        t.completedAt && this.dateStr(new Date(t.completedAt)) === day
      ).length;
    });

    const maxCount = Math.max(...counts, 1);
    const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];

    container.innerHTML = `<div class="trend-chart-content">${days.map((day, i) => {
      const d = new Date(day);
      const h = Math.max((counts[i] / maxCount) * 130, 4);
      return `<div class="trend-bar-wrap">
        <div class="trend-bar" style="height:${h}px"><span class="bar-value">${counts[i]}</span></div>
        <span class="trend-label">${(d.getMonth() + 1)}/${d.getDate()} 周${dayLabels[d.getDay()]}</span>
      </div>`;
    }).join('')}</div>`;
  },

  // ==================== 导入导出 ====================
  exportData() {
    const data = {
      tasks: this.tasks,
      reviews: this.reviews,
      notes: this.notes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `workflow-backup-${this.dateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.toast('数据已导出', 'success');
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.tasks) this.tasks = data.tasks;
        if (data.reviews) this.reviews = data.reviews;
        if (data.notes) this.notes = data.notes;
        this.saveData();
        this.renderTasks();
        this.renderCalendar();
        this.renderReviews();
        this.renderStats();
        this.renderNotes();
        this.toast('数据已导入', 'success');
      } catch {
        this.toast('导入失败，请检查文件格式', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  },

  // ==================== 我的笔记 ====================
  openNoteModal(noteId) {
    const modal = document.getElementById('noteModal');
    const title = document.getElementById('noteModalTitle');
    if (noteId) {
      const note = this.notes.find(n => n.id === noteId);
      if (!note) return;
      title.textContent = '编辑笔记';
      document.getElementById('noteId').value = note.id;
      document.getElementById('noteTitle').value = note.title;
      document.getElementById('noteCategory').value = note.category || 'work';
      document.getElementById('noteTags').value = (note.tags || []).join(', ');
      document.getElementById('noteContent').value = note.content || '';
    } else {
      title.textContent = '新建笔记';
      document.getElementById('noteId').value = '';
      document.getElementById('noteTitle').value = '';
      document.getElementById('noteCategory').value = 'work';
      document.getElementById('noteTags').value = '';
      document.getElementById('noteContent').value = '';
    }
    modal.classList.add('show');
    setTimeout(() => document.getElementById('noteTitle').focus(), 100);
  },

  closeNoteModal() {
    document.getElementById('noteModal').classList.remove('show');
  },

  saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    if (!title) {
      this.toast('请输入笔记标题', 'warning');
      return;
    }
    if (!content) {
      this.toast('请输入笔记内容', 'warning');
      return;
    }

    const id = document.getElementById('noteId').value;
    const noteData = {
      title,
      category: document.getElementById('noteCategory').value,
      tags: document.getElementById('noteTags').value.split(',').map(t => t.trim()).filter(Boolean),
      content,
      updatedAt: new Date().toISOString(),
    };

    if (id) {
      const idx = this.notes.findIndex(n => n.id === id);
      if (idx !== -1) {
        this.notes[idx] = { ...this.notes[idx], ...noteData };
        this.toast('笔记已更新', 'success');
      }
    } else {
      noteData.id = this.genId();
      noteData.createdAt = new Date().toISOString();
      this.notes.unshift(noteData);
      this.toast('笔记已创建', 'success');
    }

    this.saveData();
    this.renderNotes();
    this.closeNoteModal();
  },

  deleteNote(id) {
    if (!confirm('确定删除该笔记吗？')) return;
    this.notes = this.notes.filter(n => n.id !== id);
    this.saveData();
    this.renderNotes();
    this.closeNoteDetail();
    this.toast('笔记已删除', 'success');
  },

  showNoteDetail(id) {
    const note = this.notes.find(n => n.id === id);
    if (!note) return;

    const categoryLabels = { work: '工作', study: '学习', idea: '想法', other: '其他' };
    const tags = (note.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('') || '-';
    const contentHtml = this.esc(note.content).replace(/\n/g, '<br>');

    document.getElementById('noteDetailBody').innerHTML = `
      <div class="detail-row"><span class="detail-label">标题</span><span class="detail-value" style="font-weight:600;font-size:16px">${this.esc(note.title)}</span></div>
      <div class="detail-row"><span class="detail-label">分类</span><span class="detail-value"><span class="note-category-badge badge-note-${note.category}">${categoryLabels[note.category] || note.category}</span></span></div>
      <div class="detail-row"><span class="detail-label">标签</span><span class="detail-value">${tags}</span></div>
      <div class="detail-row"><span class="detail-label">创建时间</span><span class="detail-value">${this.formatDateTime(note.createdAt)}</span></div>
      <div class="detail-row"><span class="detail-label">更新时间</span><span class="detail-value">${this.formatDateTime(note.updatedAt)}</span></div>
      <div class="note-detail-content"><p>${contentHtml}</p></div>
    `;

    document.getElementById('editNoteBtn').onclick = () => {
      this.closeNoteDetail();
      this.openNoteModal(id);
    };
    document.getElementById('deleteNoteBtn').onclick = () => this.deleteNote(id);
    document.getElementById('noteDetailModal').classList.add('show');
  },

  closeNoteDetail() {
    document.getElementById('noteDetailModal').classList.remove('show');
  },

  getFilteredNotes() {
    const search = (document.getElementById('noteSearch')?.value || '').toLowerCase();
    const category = document.getElementById('noteCategoryFilter')?.value || 'all';
    const sortBy = document.getElementById('noteSortBy')?.value || 'updatedAt';

    let list = this.notes.filter(n => {
      const matchCategory = category === 'all' || n.category === category;
      const matchSearch = !search
        || n.title.toLowerCase().includes(search)
        || (n.content || '').toLowerCase().includes(search)
        || (n.tags || []).some(tag => tag.toLowerCase().includes(search));
      return matchCategory && matchSearch;
    });

    list.sort((a, b) => {
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      return new Date(b[sortBy] || 0) - new Date(a[sortBy] || 0);
    });

    return list;
  },

  renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;
    const list = this.getFilteredNotes();

    if (list.length === 0) {
      const search = (document.getElementById('noteSearch')?.value || '').trim();
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <p>${search ? '未找到匹配的笔记' : '暂无笔记，点击"新建笔记"开始记录'}</p></div>`;
      return;
    }

    const categoryLabels = { work: '工作', study: '学习', idea: '想法', other: '其他' };

    container.innerHTML = list.map(n => {
      const tags = (n.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('');
      const preview = (n.content || '').substring(0, 120).replace(/\n/g, ' ');

      return `<div class="note-card" onclick="app.showNoteDetail('${n.id}')">
        <div class="note-card-header">
          <span class="note-category-badge badge-note-${n.category}">${categoryLabels[n.category] || n.category}</span>
          <span class="note-card-time">${this.formatDateTime(n.updatedAt)}</span>
        </div>
        <div class="note-card-title">${this.esc(n.title)}</div>
        <div class="note-card-preview">${this.esc(preview)}${(n.content || '').length > 120 ? '...' : ''}</div>
        <div class="note-card-footer">
          <div class="note-card-tags">${tags}</div>
          <div class="note-card-actions">
            <button onclick="event.stopPropagation(); app.openNoteModal('${n.id}')">编辑</button>
            <button class="delete-btn" onclick="event.stopPropagation(); app.deleteNote('${n.id}')">删除</button>
          </div>
        </div>
      </div>`;
    }).join('');
  },

  // ==================== JSON 格式化工具 ====================
  onJsonInput() {
    const text = document.getElementById('jsonInput').value.trim();
    const status = document.getElementById('jsonStatus');
    if (!text) {
      status.innerHTML = '';
      return;
    }
    try {
      JSON.parse(text);
      status.innerHTML = '<span class="json-valid">JSON 格式正确</span>';
    } catch (e) {
      const msg = e.message.replace(/^JSON\.parse: /, '');
      status.innerHTML = `<span class="json-invalid">格式错误: ${this.esc(msg)}</span>`;
    }
  },

  formatJson() {
    const input = document.getElementById('jsonInput').value.trim();
    if (!input) {
      this.toast('请输入 JSON 数据', 'warning');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const indentVal = document.getElementById('jsonIndent').value;
      const indent = indentVal === 'tab' ? '\t' : parseInt(indentVal);
      const formatted = JSON.stringify(parsed, null, indent);
      this.showJsonOutput(formatted, parsed);
    } catch (e) {
      this.toast('JSON 格式错误，无法格式化', 'error');
    }
  },

  compressJson() {
    const input = document.getElementById('jsonInput').value.trim();
    if (!input) {
      this.toast('请输入 JSON 数据', 'warning');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const compressed = JSON.stringify(parsed);
      this.showJsonOutput(compressed, parsed);
    } catch (e) {
      this.toast('JSON 格式错误，无法压缩', 'error');
    }
  },

  showJsonOutput(text, parsed) {
    const output = document.getElementById('jsonOutput');
    output.innerHTML = this.syntaxHighlightJson(text);

    // 统计信息
    const size = new Blob([text]).size;
    const sizeStr = size > 1024 ? (size / 1024).toFixed(1) + ' KB' : size + ' B';
    document.getElementById('jsonInfoSize').textContent = '大小: ' + sizeStr;
    document.getElementById('jsonInfoKeys').textContent = '键数: ' + this.countJsonKeys(parsed);
    document.getElementById('jsonInfoDepth').textContent = '深度: ' + this.getJsonDepth(parsed);
    document.getElementById('jsonInfoType').textContent = '类型: ' + (Array.isArray(parsed) ? 'Array' : typeof parsed === 'object' && parsed !== null ? 'Object' : typeof parsed);
  },

  syntaxHighlightJson(json) {
    const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );
  },

  countJsonKeys(obj) {
    if (typeof obj !== 'object' || obj === null) return 0;
    let count = 0;
    if (Array.isArray(obj)) {
      obj.forEach(item => { count += this.countJsonKeys(item); });
    } else {
      count = Object.keys(obj).length;
      Object.values(obj).forEach(val => { count += this.countJsonKeys(val); });
    }
    return count;
  },

  getJsonDepth(obj) {
    if (typeof obj !== 'object' || obj === null) return 0;
    const values = Array.isArray(obj) ? obj : Object.values(obj);
    if (values.length === 0) return 1;
    return 1 + Math.max(...values.map(v => this.getJsonDepth(v)));
  },

  clearJsonInput() {
    document.getElementById('jsonInput').value = '';
    document.getElementById('jsonOutput').innerHTML = '<span class="json-placeholder">格式化结果将显示在这里</span>';
    document.getElementById('jsonStatus').innerHTML = '';
    document.getElementById('jsonInfoSize').textContent = '大小: -';
    document.getElementById('jsonInfoKeys').textContent = '键数: -';
    document.getElementById('jsonInfoDepth').textContent = '深度: -';
    document.getElementById('jsonInfoType').textContent = '类型: -';
  },

  async pasteToJson() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('jsonInput').value = text;
      this.onJsonInput();
    } catch {
      this.toast('无法读取剪贴板', 'warning');
    }
  },

  loadSampleJson() {
    const sample = {
      "name": "WorkFlow",
      "version": "1.0.0",
      "description": "日常工作记录应用",
      "features": ["事务管理", "排期日历", "复盘总结", "翻译工具", "JSON格式化"],
      "author": { "name": "Developer", "email": "dev@example.com" },
      "config": { "port": 8090, "debug": false, "maxItems": 1000 },
      "tags": ["productivity", "workflow", "tool"]
    };
    document.getElementById('jsonInput').value = JSON.stringify(sample);
    this.onJsonInput();
    this.toast('已加载示例 JSON', 'success');
  },

  copyJsonOutput() {
    const output = document.getElementById('jsonOutput');
    const text = output.innerText;
    if (!text || text === '格式化结果将显示在这里') {
      this.toast('没有可复制的内容', 'warning');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      this.toast('已复制到剪贴板', 'success');
    }).catch(() => {
      this.toast('复制失败', 'error');
    });
  },

  downloadJson() {
    const output = document.getElementById('jsonOutput');
    const text = output.innerText;
    if (!text || text === '格式化结果将显示在这里') {
      this.toast('没有可下载的内容', 'warning');
      return;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `formatted-${this.dateStr(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.toast('文件已下载', 'success');
  },

  // ==================== 翻译工具 ====================
  translateTimer: null,
  translateHistory: [],

  onTranslateInput() {
    const text = document.getElementById('translateInput').value;
    document.getElementById('translateCharCount').textContent = text.length + ' 字符';
  },

  swapLanguages() {
    const from = document.getElementById('translateFrom');
    const to = document.getElementById('translateTo');
    if (from.value === 'auto') return;
    const tmp = from.value;
    from.value = to.value;
    to.value = tmp;
  },

  clearTranslateInput() {
    document.getElementById('translateInput').value = '';
    document.getElementById('translateCharCount').textContent = '0 字符';
    document.getElementById('translateOutput').innerHTML = '<div class="translate-placeholder">翻译结果将显示在这里</div>';
  },

  async pasteToTranslate() {
    try {
      const text = await navigator.clipboard.readText();
      document.getElementById('translateInput').value = text;
      this.onTranslateInput();
    } catch {
      this.toast('无法读取剪贴板', 'warning');
    }
  },

  copyTranslateResult() {
    const output = document.getElementById('translateOutput');
    const text = output.innerText;
    if (!text || text === '翻译结果将显示在这里') {
      this.toast('没有可复制的内容', 'warning');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      this.toast('已复制到剪贴板', 'success');
    }).catch(() => {
      this.toast('复制失败', 'error');
    });
  },

  async doTranslate() {
    const text = document.getElementById('translateInput').value.trim();
    if (!text) {
      this.toast('请输入要翻译的文本', 'warning');
      return;
    }

    const from = document.getElementById('translateFrom').value;
    const to = document.getElementById('translateTo').value;
    const output = document.getElementById('translateOutput');
    output.innerHTML = '<div class="translate-loading"><div class="loading-dots"><span></span><span></span><span></span></div>翻译中...</div>';

    try {
      const resp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, from, to }),
      });

      if (!resp.ok) throw new Error('翻译请求失败');
      const data = await resp.json();

      if (data.result) {
        output.innerHTML = `<div class="translate-result-text">${this.esc(data.result)}</div>`;
        if (data.detectedLang) {
          output.innerHTML += `<div class="translate-detected-lang">检测语言: ${this.getLangLabel(data.detectedLang)}</div>`;
        }
        this.addTranslateHistory(text, data.result, from, to, data.detectedLang);
      } else {
        output.innerHTML = `<div class="translate-result-text">${this.esc(data.result || text)}</div>`;
      }
    } catch (e) {
      output.innerHTML = `<div class="translate-error">翻译失败: ${this.esc(e.message)}</div>`;
    }
  },

  getLangLabel(code) {
    const map = {
      'auto': '自动检测', 'zh': '中文', 'en': '英语', 'ja': '日语', 'ko': '韩语',
      'fr': '法语', 'de': '德语', 'es': '西班牙语', 'ru': '俄语', 'pt': '葡萄牙语', 'it': '意大利语',
    };
    return map[code] || code;
  },

  addTranslateHistory(source, result, from, to, detectedLang) {
    this.translateHistory.unshift({
      id: this.genId(),
      source: source.substring(0, 200),
      result: result.substring(0, 200),
      from: detectedLang || from,
      to,
      time: new Date().toISOString(),
    });
    if (this.translateHistory.length > 20) this.translateHistory.pop();
    this.renderTranslateHistory();
  },

  renderTranslateHistory() {
    const container = document.getElementById('translateHistoryList');
    if (!container) return;
    if (this.translateHistory.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>暂无翻译历史</p></div>';
      return;
    }
    container.innerHTML = this.translateHistory.map(h => `
      <div class="translate-history-item" onclick="app.useHistoryItem('${h.id}')">
        <div class="history-item-langs">${this.getLangLabel(h.from)} → ${this.getLangLabel(h.to)}</div>
        <div class="history-item-source">${this.esc(h.source)}</div>
        <div class="history-item-result">${this.esc(h.result)}</div>
        <div class="history-item-time">${this.formatDateTime(h.time)}</div>
      </div>
    `).join('');
  },

  useHistoryItem(id) {
    const item = this.translateHistory.find(h => h.id === id);
    if (!item) return;
    document.getElementById('translateInput').value = item.source;
    document.getElementById('translateOutput').innerHTML = `<div class="translate-result-text">${this.esc(item.result)}</div>`;
    this.onTranslateInput();
  },

  // ==================== 工具方法 ====================
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  },

  dateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  formatDate(str) {
    if (!str) return '';
    const d = new Date(str);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  formatDateTime(str) {
    if (!str) return '-';
    const d = new Date(str);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  toast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all .3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  },
};

// 启动
document.addEventListener('DOMContentLoaded', () => app.init());
