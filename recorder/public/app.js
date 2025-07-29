// Rose Voice 前端应用
class RoseVoiceApp {
  constructor() {
    this.recordings = [];
    this.currentRecording = null;
    this.searchTerm = '';
    
    // 录音相关属性
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingTimer = null;
    this.recordingStartTime = 0;
    this.isRecording = false;
    
    this.initializeElements();
    this.bindEvents();
    this.loadRecordings();
    this.initializeRecording();
  }

  // 初始化DOM元素
  initializeElements() {
    this.elements = {

      uploadProgress: document.getElementById('uploadProgress'),
      progressFill: document.getElementById('progressFill'),
      progressText: document.getElementById('progressText'),
      recordingsList: document.getElementById('recordingsList'),
      loadingState: document.getElementById('loadingState'),
      refreshBtn: document.getElementById('refreshBtn'),
      searchInput: document.getElementById('searchInput'),
      modal: document.getElementById('recordingModal'),
      modalTitle: document.getElementById('modalTitle'),
      audioPlayer: document.getElementById('audioPlayer'),
      audioElement: document.getElementById('audioElement'),
      transcriptionStatus: document.getElementById('transcriptionStatus'),
      statusBadge: document.getElementById('statusBadge'),
      transcriptionText: document.getElementById('transcriptionText'),
      downloadBtn: document.getElementById('downloadBtn'),
      copyBtn: document.getElementById('copyBtn'),
      closeModal: document.getElementById('closeModal'),
      toast: document.getElementById('toast'),
      
      // 状态指示器
      statusIndicator: document.getElementById('statusIndicator'),
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      
      // 录音相关元素
      recordBtn: document.getElementById('recordBtn'),
      stopBtn: document.getElementById('stopBtn'),
      recordIcon: document.getElementById('recordIcon'),
      recordText: document.getElementById('recordText'),
      recordingTime: document.getElementById('recordingTime'),
      timeDisplay: document.getElementById('timeDisplay'),
      audioPreview: document.getElementById('audioPreview'),
      previewAudio: document.getElementById('previewAudio'),
      saveRecordingBtn: document.getElementById('saveRecordingBtn'),
      retryBtn: document.getElementById('retryBtn')
    };
  }

  // 绑定事件
  bindEvents() {

    // 刷新按钮
    this.elements.refreshBtn.addEventListener('click', () => {
      this.loadRecordings();
    });

    // 搜索框
    this.elements.searchInput.addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.filterRecordings();
    });

    // 模态框
    this.elements.closeModal.addEventListener('click', () => {
      this.closeModal();
    });

    this.elements.modal.addEventListener('click', (e) => {
      if (e.target === this.elements.modal) {
        this.closeModal();
      }
    });

    // 模态框按钮
    this.elements.downloadBtn.addEventListener('click', () => {
      this.downloadTranscription();
    });

    this.elements.copyBtn.addEventListener('click', () => {
      this.copyTranscription();
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.elements.modal.style.display === 'flex') {
        this.closeModal();
      }
    });

    // 录音相关事件
    this.elements.recordBtn.addEventListener('click', () => {
      this.toggleRecording();
    });

    this.elements.stopBtn.addEventListener('click', () => {
      this.stopRecording();
    });

    this.elements.saveRecordingBtn.addEventListener('click', () => {
      this.saveRecording();
    });

    this.elements.retryBtn.addEventListener('click', () => {
      this.retryRecording();
    });
  }



  // 显示上传进度
  showUploadProgress() {
    this.elements.uploadProgress.style.display = 'block';
    this.elements.progressFill.style.width = '0%';
    this.elements.progressText.textContent = '上传中...';
    
    // 模拟进度
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 95) {
        progress = 95;
        clearInterval(interval);
      }
      this.elements.progressFill.style.width = `${progress}%`;
    }, 200);
  }

  // 隐藏上传进度
  hideUploadProgress() {
    this.elements.progressFill.style.width = '100%';
    this.elements.progressText.textContent = '上传完成!';
    
    setTimeout(() => {
      this.elements.uploadProgress.style.display = 'none';
    }, 1000);
  }

  // 加载录音列表
  async loadRecordings() {
    this.showLoading();
    
    try {
      const response = await fetch('/api/recordings');
      if (!response.ok) {
        throw new Error('获取录音列表失败');
      }
      
      const newRecordings = await response.json();
      
      // 检查是否有状态变化
      const hasChanges = this.checkForChanges(newRecordings);
      
      this.recordings = newRecordings;
      this.renderRecordings();
      
      // 更新状态指示器
      this.updateStatusIndicator();
      
      // 如果有变化，显示提示
      if (hasChanges && this.recordings.length > 0) {
        console.log('✅ 检测到录音状态更新');
      }
      
    } catch (error) {
      console.error('加载录音列表错误:', error);
      this.showToast('加载录音列表失败', 'error');
      this.hideLoading();
    }
  }

  // 检查录音状态变化
  checkForChanges(newRecordings) {
    if (!this.recordings || this.recordings.length === 0) {
      return false;
    }
    
    let hasChanges = false;
    
    newRecordings.forEach(newRecording => {
      const oldRecording = this.recordings.find(r => r.id === newRecording.id);
      if (oldRecording) {
        // 检查状态变化
        if (oldRecording.status !== newRecording.status) {
          console.log(`📝 录音 ${newRecording.original_name} 状态变化: ${oldRecording.status} -> ${newRecording.status}`);
          hasChanges = true;
          
          // 如果状态变为completed，显示成功提示
          if (newRecording.status === 'completed') {
            this.showToast(`🎉 "${newRecording.original_name}" 转写完成！`, 'success');
          }
        }
        
        // 检查TOS状态变化
        if (oldRecording.tos_upload_status !== newRecording.tos_upload_status) {
          console.log(`☁️ 录音 ${newRecording.original_name} TOS状态变化: ${oldRecording.tos_upload_status} -> ${newRecording.tos_upload_status}`);
          hasChanges = true;
        }
      }
    });
    
    return hasChanges;
  }

  // 更新状态指示器
  updateStatusIndicator() {
    if (!this.elements.statusDot || !this.elements.statusText) return;
    
    const processingCount = this.recordings.filter(r => 
      r.status === 'processing' || r.status === 'transcribing'
    ).length;
    
    if (processingCount > 0) {
      this.elements.statusDot.className = 'status-dot processing';
      this.elements.statusText.textContent = `处理中 (${processingCount})`;
    } else {
      this.elements.statusDot.className = 'status-dot';
      this.elements.statusText.textContent = '就绪';
    }
  }

  // 渲染录音列表
  renderRecordings() {
    this.hideLoading();
    
    const filteredRecordings = this.recordings.filter(recording => {
      if (!this.searchTerm) return true;
      
      // 解析转录结果
      let transcriptionText = '';
      if (recording.transcription) {
        try {
          const transcriptionData = JSON.parse(recording.transcription);
          transcriptionText = transcriptionData.text || recording.transcription;
        } catch (e) {
          transcriptionText = recording.transcription;
        }
      }
      
      const searchableText = [
        recording.original_name,
        transcriptionText
      ].join(' ').toLowerCase();
      
      return searchableText.includes(this.searchTerm);
    });

    if (filteredRecordings.length === 0) {
      this.showEmptyState();
      return;
    }

    const html = filteredRecordings.map(recording => {
      const date = new Date(recording.created_at).toLocaleString('zh-CN');
      
      // 解析转录结果预览
      let preview = '正在转写中...';
      if (recording.transcription && recording.status === 'completed') {
        try {
          const transcriptionData = JSON.parse(recording.transcription);
          if (transcriptionData.text && transcriptionData.text.trim()) {
            preview = transcriptionData.text.substring(0, 80) + '...';
          } else {
            preview = recording.transcription.substring(0, 80) + '...';
          }
        } catch (e) {
          // 如果JSON解析失败，直接使用原始转录文本
          preview = recording.transcription.substring(0, 80) + '...';
        }
      } else if (recording.transcription) {
        // 如果有转录数据但状态不是completed，显示原始数据
        preview = recording.transcription.substring(0, 80) + '...';
      }
      
      const statusClass = `status-${recording.status}`;
      const statusText = {
        processing: '处理中',
        transcribing: '转录中',
        completed: '已完成',
        failed: '失败'
      }[recording.status] || '未知';

      // TOS上传状态
      const tosStatusClass = `tos-status-${recording.tos_upload_status || 'pending'}`;
      const tosStatusIcon = {
        pending: '⏳',
        uploading: '📤',
        completed: '☁️',
        failed: '❌',
        skipped: '📁'
      }[recording.tos_upload_status] || '⏳';

      return `
        <div class="recording-item" data-id="${recording.id}">
          <div class="recording-header">
            <div class="recording-title">🎵 ${recording.original_name}</div>
            <div class="recording-status-group">
              <div class="tos-status ${tosStatusClass}" title="云端存储状态">${tosStatusIcon}</div>
              <div class="recording-status ${statusClass}">${statusText}</div>
            </div>
          </div>
          <div class="recording-date">${date}</div>
          <div class="recording-preview">${preview}</div>
        </div>
      `;
    }).join('');

    this.elements.recordingsList.innerHTML = html;

    // 绑定点击事件
    this.elements.recordingsList.querySelectorAll('.recording-item').forEach(item => {
      item.addEventListener('click', () => {
        const recordingId = item.dataset.id;
        this.openRecordingModal(recordingId);
      });
    });
  }

  // 显示空状态
  showEmptyState() {
    const message = this.searchTerm 
      ? `没有找到包含 "${this.searchTerm}" 的录音`
      : '还没有录音，上传一个音频文件开始吧！';
      
    this.elements.recordingsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎙️</div>
        <p>${message}</p>
      </div>
    `;
  }

  // 显示加载状态
  showLoading() {
    this.elements.loadingState.style.display = 'block';
  }

  // 隐藏加载状态
  hideLoading() {
    this.elements.loadingState.style.display = 'none';
  }

  // 筛选录音
  filterRecordings() {
    this.renderRecordings();
  }

  // 打开录音详情模态框
  async openRecordingModal(recordingId) {
    try {
      const response = await fetch(`/api/recordings/${recordingId}`);
      if (!response.ok) {
        throw new Error('获取录音详情失败');
      }
      
      this.currentRecording = await response.json();
      this.renderModal();
      this.elements.modal.style.display = 'flex';
      
    } catch (error) {
      console.error('获取录音详情错误:', error);
      this.showToast('获取录音详情失败', 'error');
    }
  }

  // 渲染模态框
  renderModal() {
    const recording = this.currentRecording;
    
    // 设置标题
    this.elements.modalTitle.textContent = recording.original_name;
    
    // 设置音频播放器
    if (recording.status === 'completed') {
      this.elements.audioPlayer.style.display = 'block';
      
      // 优先使用TOS URL，如果不可用则使用本地文件
      if (recording.tos_upload_status === 'completed' && recording.tos_file_url) {
        // 从TOS播放（需要预签名URL）
        this.loadTosAudioUrl(recording.id);
      } else {
        // 从本地播放
        this.elements.audioElement.src = `/api/audio/${recording.filename}`;
      }
    } else {
      this.elements.audioPlayer.style.display = 'none';
    }
    
    // 设置状态
    const statusClass = `status-${recording.status}`;
    const statusText = {
      processing: '⏳ 处理中',
      transcribing: '🎯 转录中',
      completed: '✅ 已完成',
      failed: '❌ 失败'
    }[recording.status] || '❓ 未知';
    
    this.elements.statusBadge.className = `status-badge ${statusClass}`;
    this.elements.statusBadge.textContent = statusText;
    
    // 添加TOS状态显示
    const tosStatus = recording.tos_upload_status || 'pending';
    const tosStatusText = {
      pending: '⏳ 等待上传',
      uploading: '📤 上传中',
      completed: '☁️ 已上传到云端',
      failed: '❌ 云端上传失败',
      skipped: '📁 仅本地存储'
    }[tosStatus] || '❓ 未知';
    
    // 在状态徽章后添加TOS状态
    const existingTosStatus = document.querySelector('.tos-status-info');
    if (existingTosStatus) {
      existingTosStatus.remove();
    }
    
    const tosStatusElement = document.createElement('div');
    tosStatusElement.className = `tos-status-info tos-status-${tosStatus}`;
    tosStatusElement.textContent = tosStatusText;
    tosStatusElement.style.marginTop = '8px';
    tosStatusElement.style.fontSize = '14px';
    tosStatusElement.style.opacity = '0.8';
    
    this.elements.statusBadge.parentNode.appendChild(tosStatusElement);
    
    // 解析并设置转写内容
    let transcriptionText = '正在转写中，请稍候...';
    let hasDetailedResult = false;
    
    if (recording.transcription && recording.status === 'completed') {
      try {
        const transcriptionData = JSON.parse(recording.transcription);
        if (transcriptionData.text && transcriptionData.text.trim()) {
          transcriptionText = transcriptionData.text;
          hasDetailedResult = true;
          
          // 如果有分句信息，显示更详细的结果
          if (transcriptionData.utterances && transcriptionData.utterances.length > 0) {
            const utterancesList = transcriptionData.utterances.map((utterance, index) => {
              return `[${Math.floor(utterance.start_time/1000)}s-${Math.floor(utterance.end_time/1000)}s] ${utterance.text}`;
            }).join('\n');
            
            transcriptionText += '\n\n📝 详细分句信息：\n' + utterancesList;
          }
          
          // 如果有音频信息，显示音频详情
          if (transcriptionData.audio_info) {
            const audioInfo = transcriptionData.audio_info;
            transcriptionText += '\n\n🎵 音频信息：\n';
            transcriptionText += `时长: ${Math.floor(audioInfo.duration/1000)}秒\n`;
            if (audioInfo.sample_rate) transcriptionText += `采样率: ${audioInfo.sample_rate}Hz\n`;
            if (audioInfo.channels) transcriptionText += `声道数: ${audioInfo.channels}\n`;
          }
          
          // 显示完成时间
          if (transcriptionData.completed_at) {
            transcriptionText += `\n⏰ 转录完成时间: ${new Date(transcriptionData.completed_at).toLocaleString('zh-CN')}`;
          }
        } else {
          transcriptionText = recording.transcription;
        }
      } catch (e) {
        transcriptionText = recording.transcription;
      }
    } else if (recording.transcription) {
      transcriptionText = recording.transcription;
    }
    
    this.elements.transcriptionText.textContent = transcriptionText;
    
    // 设置按钮状态
    const hasTranscription = recording.transcription && recording.status === 'completed';
    this.elements.downloadBtn.disabled = !hasTranscription;
    this.elements.copyBtn.disabled = !hasTranscription;
    
    if (!hasTranscription) {
      this.elements.downloadBtn.style.opacity = '0.5';
      this.elements.copyBtn.style.opacity = '0.5';
    } else {
      this.elements.downloadBtn.style.opacity = '1';
      this.elements.copyBtn.style.opacity = '1';
    }
  }

  // 加载TOS音频URL
  async loadTosAudioUrl(recordingId) {
    try {
      const response = await fetch(`/api/tos-url/${recordingId}`);
      if (response.ok) {
        const data = await response.json();
        this.elements.audioElement.src = data.url;
        console.log('🎵 从云端加载音频');
      } else {
        // 降级到本地文件
        this.elements.audioElement.src = `/api/audio/${this.currentRecording.filename}`;
        console.log('🎵 降级到本地音频文件');
      }
    } catch (error) {
      console.error('加载TOS音频URL失败:', error);
      // 降级到本地文件
      this.elements.audioElement.src = `/api/audio/${this.currentRecording.filename}`;
    }
  }

  // 关闭模态框
  closeModal() {
    this.elements.modal.style.display = 'none';
    this.currentRecording = null;
    
    // 停止音频播放
    if (this.elements.audioElement.src) {
      this.elements.audioElement.pause();
      this.elements.audioElement.currentTime = 0;
    }
  }

  // 下载转写文本
  async downloadTranscription() {
    if (!this.currentRecording) return;
    
    try {
      const response = await fetch(`/api/download/${this.currentRecording.id}`);
      if (!response.ok) {
        throw new Error('下载失败');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentRecording.original_name}_transcription.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      this.showToast('文件下载成功！', 'success');
      
    } catch (error) {
      console.error('下载错误:', error);
      this.showToast('下载失败', 'error');
    }
  }

  // 复制转写文本
  async copyTranscription() {
    if (!this.currentRecording || !this.currentRecording.transcription) return;
    
    try {
      // 解析转录结果，只复制主要文本
      let textToCopy = this.currentRecording.transcription;
      try {
        const transcriptionData = JSON.parse(this.currentRecording.transcription);
        if (transcriptionData.text) {
          textToCopy = transcriptionData.text;
        }
      } catch (e) {
        // 如果解析失败，使用原始文本
      }
      
      await navigator.clipboard.writeText(textToCopy);
      this.showToast('文本已复制到剪贴板！', 'success');
    } catch (error) {
      console.error('复制错误:', error);
      
      // 降级方案
      let textToCopy = this.currentRecording.transcription;
      try {
        const transcriptionData = JSON.parse(this.currentRecording.transcription);
        if (transcriptionData.text) {
          textToCopy = transcriptionData.text;
        }
      } catch (e) {
        // 如果解析失败，使用原始文本
      }
      
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.showToast('文本已复制到剪贴板！', 'success');
      } catch (err) {
        this.showToast('复制失败', 'error');
      }
      document.body.removeChild(textArea);
    }
  }

  // 显示消息提示
  showToast(message, type = 'success') {
    this.elements.toast.textContent = message;
    this.elements.toast.className = `toast ${type}`;
    this.elements.toast.classList.add('show');
    
    setTimeout(() => {
      this.elements.toast.classList.remove('show');
    }, 3000);
  }

  // 初始化录音功能
  async initializeRecording() {
    try {
      // 检查浏览器是否支持录音
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('浏览器不支持录音功能');
        this.elements.recordBtn.disabled = true;
        this.elements.recordBtn.textContent = '浏览器不支持录音';
        return;
      }

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // 关闭流，只是为了测试权限
      stream.getTracks().forEach(track => track.stop());
      
      console.log('🎙️ 录音功能初始化成功');
      this.showToast('录音功能已就绪！', 'success');
      
    } catch (error) {
      console.error('录音功能初始化失败:', error);
      this.elements.recordBtn.disabled = true;
      this.elements.recordText.textContent = '无法访问麦克风';
      this.showToast('无法访问麦克风，请检查权限设置', 'error');
    }
  }

  // 切换录音状态
  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  // 开始录音
  async startRecording() {
    try {
      // 获取媒体流
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // 创建 MediaRecorder
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      // 监听数据事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // 监听停止事件
      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio();
        stream.getTracks().forEach(track => track.stop());
      };

      // 开始录音
      this.mediaRecorder.start();

      // 更新UI
      this.updateRecordingUI();
      this.startTimer();

      this.showToast('🎙️ 录音开始...', 'success');

    } catch (error) {
      console.error('开始录音失败:', error);
      this.showToast('录音失败，请检查麦克风权限', 'error');
    }
  }

  // 停止录音
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.stopTimer();
      this.updateRecordingUI();
      this.showToast('录音已停止', 'success');
    }
  }

  // 更新录音UI状态
  updateRecordingUI() {
    if (this.isRecording) {
      // 录音中状态
      this.elements.recordBtn.classList.add('recording');
      this.elements.recordIcon.textContent = '🔴';
      this.elements.recordText.textContent = '录音中...';
      this.elements.stopBtn.disabled = false;
      this.elements.recordingTime.style.display = 'block';
    } else {
      // 停止状态
      this.elements.recordBtn.classList.remove('recording');
      this.elements.recordIcon.textContent = '🎙️';
      this.elements.recordText.textContent = '开始录音';
      this.elements.stopBtn.disabled = true;
      this.elements.recordingTime.style.display = 'none';
    }
  }

  // 开始计时器
  startTimer() {
    this.recordingTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      this.elements.timeDisplay.textContent = `${minutes}:${seconds}`;
    }, 1000);
  }

  // 停止计时器
  stopTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  // 处理录制的音频
  processRecordedAudio() {
    // 创建音频 Blob
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    
    // 创建音频 URL
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // 显示预览
    this.elements.previewAudio.src = audioUrl;
    this.elements.audioPreview.style.display = 'block';
    
    // 保存 Blob 用于上传
    this.currentAudioBlob = audioBlob;
  }

  // 保存录音
  async saveRecording() {
    if (!this.currentAudioBlob) {
      this.showToast('没有录音数据', 'error');
      return;
    }

    try {
      // 创建文件名 - 仅使用时间戳，避免中文字符导致的编码问题
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `recording_${timestamp}.webm`;

      // 创建 FormData
      const formData = new FormData();
      formData.append('recording', this.currentAudioBlob, filename);

      // 显示上传进度
      this.showUploadProgress();

      // 上传到服务器
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`);
      }

      const result = await response.json();
      
      this.showToast(`✨ ${result.message}`, 'success');
      this.hideUploadProgress();
      
      // 清理录音状态
      this.resetRecordingState();
      
      // 立即刷新录音列表
      this.loadRecordings();
      
      // 开始积极轮询，监控新上传的录音状态
      this.startAggressivePolling(result.id);

    } catch (error) {
      console.error('保存录音失败:', error);
      this.showToast(`保存失败: ${error.message}`, 'error');
      this.hideUploadProgress();
    }
  }

  // 重新录音
  retryRecording() {
    this.resetRecordingState();
    this.showToast('可以开始新的录音了', 'success');
  }

  // 重置录音状态
  resetRecordingState() {
    // 清理音频数据
    if (this.currentAudioBlob) {
      URL.revokeObjectURL(this.elements.previewAudio.src);
      this.currentAudioBlob = null;
    }
    
    // 隐藏预览
    this.elements.audioPreview.style.display = 'none';
    this.elements.previewAudio.src = '';
    
    // 重置计时器显示
    this.elements.timeDisplay.textContent = '00:00';
    
    // 清理音频块
    this.audioChunks = [];
  }

  // 定期刷新处理中和转写中的录音状态
  startPolling() {
    setInterval(() => {
      // 检查是否有处理中或转写中的录音
      const hasProcessing = this.recordings.some(r => 
        r.status === 'processing' || r.status === 'transcribing'
      );
      
      if (hasProcessing) {
        console.log('🔄 发现处理中的录音，自动刷新列表...');
        this.loadRecordings();
      }
      
      // 如果模态框打开且当前录音在处理中，刷新详情
      if (this.currentRecording && 
          (this.currentRecording.status === 'processing' || 
           this.currentRecording.status === 'transcribing')) {
        console.log('🔄 模态框中的录音处理中，刷新详情...');
        this.openRecordingModal(this.currentRecording.id);
      }
    }, 2000); // 每2秒检查一次，更及时
  }

  // 对新上传的录音进行积极轮询
  startAggressivePolling(recordingId) {
    let attempts = 0;
    const maxAttempts = 30; // 最多轮询1分钟 (30次 * 2秒)
    
    const aggressiveInterval = setInterval(() => {
      attempts++;
      
      // 查找目标录音
      const recording = this.recordings.find(r => r.id === recordingId);
      
      if (recording && recording.status === 'completed') {
        // 转写完成，停止积极轮询
        console.log(`🎉 录音 ${recording.original_name} 转写完成，停止积极轮询`);
        clearInterval(aggressiveInterval);
        this.showToast(`🎊 "${recording.original_name}" 已完成转写！`, 'success');
        return;
      }
      
      if (attempts >= maxAttempts) {
        // 超时，停止积极轮询
        console.log(`⏰ 录音 ${recordingId} 积极轮询超时`);
        clearInterval(aggressiveInterval);
        return;
      }
      
      // 继续轮询
      console.log(`🔍 积极轮询录音状态 (${attempts}/${maxAttempts})`);
      this.loadRecordings();
      
    }, 2000); // 每2秒轮询一次
  }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  const app = new RoseVoiceApp();
  app.startPolling();
  
  // 添加一些可爱的加载动画
  const addFloatingElements = () => {
    const emojis = ['🎵', '🎙️', '🎶', '✨', '💫'];
    
    setInterval(() => {
      const emoji = document.createElement('div');
      emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      emoji.style.position = 'fixed';
      emoji.style.left = Math.random() * window.innerWidth + 'px';
      emoji.style.top = '100vh';
      emoji.style.fontSize = '20px';
      emoji.style.pointerEvents = 'none';
      emoji.style.zIndex = '9999';
      emoji.style.transition = 'all 3s ease-out';
      emoji.style.opacity = '0.7';
      
      document.body.appendChild(emoji);
      
      setTimeout(() => {
        emoji.style.top = '-50px';
        emoji.style.opacity = '0';
      }, 100);
      
      setTimeout(() => {
        document.body.removeChild(emoji);
      }, 3100);
    }, 10000); // 每10秒添加一个浮动元素
  };
  
  // 启动浮动动画（可选）
  if (Math.random() > 0.5) {
    addFloatingElements();
  }
}); 