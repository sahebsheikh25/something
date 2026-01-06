// SN Security Chatbot - vanilla JS
(function(){
  // Elements
  const button = document.getElementById('sn-chat-button');
  const panel = document.getElementById('sn-chat-panel');
  const closeBtn = document.getElementById('sn-chat-close');
  const form = document.getElementById('sn-chat-form');
  const input = document.getElementById('sn-chat-input');
  const messagesEl = document.getElementById('sn-chat-messages');
  const typingEl = document.getElementById('sn-chat-typing');

  if(!button || !panel) return; // graceful noop if not included

  // in-memory session messages (kept per-tab)
  let messages = JSON.parse(sessionStorage.getItem('sn_chat_messages')||'[]');
  const MAX_HISTORY = 8;

  // init render
  function renderMessages(){
    messagesEl.innerHTML = '';
    messages.forEach(m=>{
      const d = document.createElement('div'); d.className = 'sn-msg '+(m.role==='user'?'user':'bot');
      d.textContent = m.content;
      messagesEl.appendChild(d);
    });
    scrollToBottom();
  }
  renderMessages();

  function pushMessage(role, text){
    messages.push({role, content:text});
    if(messages.length>MAX_HISTORY) messages = messages.slice(-MAX_HISTORY);
    sessionStorage.setItem('sn_chat_messages', JSON.stringify(messages));
    renderMessages();
  }

  function setTyping(on){ typingEl.classList.toggle('hidden', !on); scrollToBottom(); }

  function scrollToBottom(){
    requestAnimationFrame(()=>{
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  // Open/close
  function openChat(){
    panel.classList.add('open'); panel.classList.remove('closed');
    panel.setAttribute('aria-hidden','false');
    // mobile: full screen and disable body scroll
    if(window.matchMedia('(max-width:700px)').matches){
      document.body.style.overflow = 'hidden';
    }
    // focus input shortly after open
    setTimeout(()=> input.focus(), 220);
  }
  function closeChat(){
    panel.classList.remove('open'); panel.classList.add('closed');
    panel.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  // Toggle behavior: click opens unless dragging occurred
  let isOpen = false;
  function toggleChat(){ isOpen ? closeChat() : openChat(); isOpen = !isOpen }

  // Submit handler
  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const text = input.value.trim(); if(!text) return;
    input.value = ''; pushMessage('user', text);
    setTyping(true);
    try{
      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ messages: messages })
      });
      if(!res.ok){
        const j = await res.json().catch(()=>null);
        const friendly = (j && j.error) ? j.error : 'SN: Sorry, the assistant is temporarily unavailable. Please try again later.';
        pushMessage('bot', friendly);
      } else {
        const j = await res.json();
        const reply = (j && j.reply) ? j.reply : (j && j.output) ? JSON.stringify(j.output) : 'SN: I could not parse a reply.';
        pushMessage('bot', reply);
      }
    }catch(err){
      pushMessage('bot', 'SN: Network error. Please try again.');
    }finally{ setTyping(false); }
  });

  // Open/close clicks
  button.addEventListener('click', (e)=>{ if(!wasDragging) toggleChat(); });
  closeBtn.addEventListener('click', ()=>{ if(isOpen) toggleChat(); });

  // Dragging with pointer events; only prevent scrolling if an actual drag starts
  let dragging=false, wasDragging=false, startX=0, startY=0, origX=null, origY=null;
  const buttonEl = button;
  // ensure initial absolute position inline styles for moving
  const computed = window.getComputedStyle(buttonEl);
  const initRight = parseFloat(computed.right) || 18;
  const initBottom = parseFloat(computed.bottom) || 22;
  buttonEl.style.right = initRight+'px'; buttonEl.style.bottom = initBottom+'px';

  function onPointerDown(e){
    wasDragging = false; dragging=false;
    startX = e.clientX; startY = e.clientY;
    origX = parseFloat(buttonEl.style.right); origY = parseFloat(buttonEl.style.bottom);
    buttonEl.setPointerCapture && buttonEl.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', onPointerMove, {passive:false});
    window.addEventListener('pointerup', onPointerUp);
  }

  function onPointerMove(e){
    const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
    if(!dragging && (dx>6 || dy>6)){
      dragging = true; wasDragging = true;
    }
    if(dragging){
      e.preventDefault();
      // compute new right/bottom
      const vw = window.innerWidth, vh = window.innerHeight;
      let newRight = vw - e.clientX - (buttonEl.offsetWidth/2);
      let newBottom = vh - e.clientY - (buttonEl.offsetHeight/2);
      // clamp with margin
      const margin = 8;
      newRight = Math.max(margin, Math.min(vw - buttonEl.offsetWidth - margin, newRight));
      newBottom = Math.max(margin, Math.min(vh - buttonEl.offsetHeight - margin, newBottom));
      buttonEl.style.right = newRight + 'px'; buttonEl.style.bottom = newBottom + 'px';
    }
  }

  function onPointerUp(e){
    window.removeEventListener('pointermove', onPointerMove, {passive:false});
    window.removeEventListener('pointerup', onPointerUp);
    if(dragging){
      // snap to left or right edge
      const vw = window.innerWidth; const bx = buttonEl.getBoundingClientRect().left + buttonEl.offsetWidth/2;
      const snapRight = (bx > vw/2);
      const margin = 12;
      if(snapRight){ buttonEl.style.right = margin + 'px'; }
      else { buttonEl.style.right = (vw - buttonEl.offsetWidth - margin) + 'px'; }
      // keep bottom as is (already set)
      setTimeout(()=> wasDragging = true, 50);
    }
    dragging = false;
    try{ buttonEl.releasePointerCapture && buttonEl.releasePointerCapture(e.pointerId); }catch(e){}
  }

  // attach pointerdown with non-passive to allow preventDefault on move
  buttonEl.addEventListener('pointerdown', onPointerDown, {passive:true});

  // VisualViewport handling to keep messages visible when mobile keyboard opens
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize', ()=>{
      // on mobile when keyboard opens, viewport height shrinks; ensure last message visible
      scrollToBottom();
    });
  }

  // Ensure messages auto-scroll when content changes
  const ro = new MutationObserver(scrollToBottom);
  ro.observe(messagesEl, {childList:true, subtree:true});

  // preserve wasDragging flag reset after short interval so clicks will work after drag
  document.addEventListener('pointerup', ()=>{ setTimeout(()=>{ wasDragging = false; }, 220); });

  // initial small state
  panel.classList.add('closed');
})();
