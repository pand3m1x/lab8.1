/* app.js — StudyEasy flashcards logic
Features implemented:
- Create decks (max 15)
- Add cards with front/back text or image URL
- LocalStorage persistence
- Study mode with flip, Correct, Needs Work, and round management
- Simple modal for adding cards
*/

const LS_KEY = 'studyeasy.state_v1';

let state = {
  decks: [],
  activeDeckId: null,
  study: null // { queue:[], correct:[], again:[] }
};

// DOM refs
const decksListEl = document.getElementById('decks-list');
const emptyStateEl = document.getElementById('empty-state');
const addDeckBtn = document.getElementById('add-deck');
const addCardBtn = document.getElementById('add-card');
const deckNameEl = document.getElementById('deck-name');
const cardDisplayEl = document.getElementById('card-display');
const flipBtn = document.getElementById('flip-btn');
const correctBtn = document.getElementById('correct-btn');
const againBtn = document.getElementById('again-btn');
const studyControlsEl = document.getElementById('study-controls');
const studyFooterEl = document.getElementById('study-footer');

function showInlineMessage(text, timeout=3500){
  // Use a single inline message inside the study footer and announce it for screen readers
  let el = studyFooterEl.querySelector('.inline-msg');
  if(!el){
    el = document.createElement('div');
    el.className = 'inline-msg';
    el.setAttribute('role','status');
    el.setAttribute('aria-live','polite');
    studyFooterEl.prepend(el);
  }
  el.textContent = text;
  el.classList.remove('fade-out');
  // clear previous timeout if present
  if(el._timeout) clearTimeout(el._timeout);

  // Auto-hide after timeout with a fade
  el._timeout = setTimeout(()=>{ el.classList.add('fade-out'); el._timeout = setTimeout(()=> el.remove(), 300); }, timeout);
}

function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
} 
function loadState(){
  const raw = localStorage.getItem(LS_KEY);
  if(raw){
    try{ state = JSON.parse(raw); } catch(e){ console.warn('Corrupt state, resetting'); state = {decks:[], activeDeckId:null, study:null}; }
  }
}

function uid(prefix='id'){
  return `${prefix}_${Math.random().toString(36).slice(2,9)}`;
}

function renderDecks(){
  decksListEl.innerHTML='';
  state.decks.forEach(deck =>{
    const li = document.createElement('li'); li.className='deck-item';
    const title = document.createElement('span'); title.textContent = deck.title;

    const controls = document.createElement('div');
    controls.style.display='flex'; controls.style.gap='0.5rem';

    const openBtn = document.createElement('button'); openBtn.className='btn secondary open-btn'; openBtn.textContent='Open';
    openBtn.addEventListener('click', ()=> openDeck(deck.id));

    const deleteBtn = document.createElement('button'); deleteBtn.className='btn'; deleteBtn.textContent='Delete';
    deleteBtn.addEventListener('click', ()=> { if(confirm(`Delete deck "${deck.title}"?`)){ deleteDeck(deck.id); } });

    controls.appendChild(openBtn); controls.appendChild(deleteBtn);
    li.appendChild(title); li.appendChild(controls);
    decksListEl.appendChild(li);
  });
  updateEmptyState();
}

function updateEmptyState(){
  if(state.decks.length===0) emptyStateEl.style.display='flex'; else emptyStateEl.style.display='none';
}

function createDeck(){
  if(state.decks.length>=5){ 
  alert('You can only have up to 5 decks.');
  return; }
  const title = prompt('Deck title:');
  if(!title) return;
  const deck = { id: uid('deck'), title: title.trim(), cards: [] };
  state.decks.push(deck);
  saveState(); renderDecks();
  openDeck(deck.id);
  // After creation prompt to add first card
  if(confirm('Add a card to this deck now?')){
    showAddCardModal(deck.id);
  }
}

function deleteDeck(deckId){
  state.decks = state.decks.filter(d=>d.id!==deckId);
  if(state.activeDeckId===deckId){ state.activeDeckId=null; state.study=null; }
  saveState(); renderDecks(); renderActiveDeck();
}

function openDeck(deckId){
  state.activeDeckId = deckId;
  prepareStudy();
  saveState(); renderDecks(); renderActiveDeck();
}

function prepareStudy(){
  const deck = state.decks.find(d=>d.id===state.activeDeckId);
  if(!deck) { state.study = null; return; }
  // initialize a study round: shuffle card ids
  const ids = deck.cards.map(c=>c.id);
  const queue = shuffleArray(ids.slice());
  state.study = { queue, correct: [], again: [] };
}

function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}

function renderActiveDeck(){
  const deck = state.decks.find(d=>d.id===state.activeDeckId);
  if(!deck){ deckNameEl.textContent='(No deck selected)'; addCardBtn.disabled=true; studyControlsEl.style.display='none'; cardDisplayEl.innerHTML='Select a deck from the right to begin studying.'; studyFooterEl.querySelectorAll('.piles, .start-new-round').forEach(n=>n?.remove()); return; }

  deckNameEl.textContent = deck.title;
  addCardBtn.disabled = false;

  // if deck has no cards
  if(deck.cards.length===0){ studyControlsEl.style.display='none'; cardDisplayEl.innerHTML = 'This deck has no cards. Use <strong>Add Card</strong> to add one.'; updatePiles(); return; }

  // if study not initialized
  if(!state.study) prepareStudy();

  // show card
  const currentId = state.study.queue[0];
  if(!currentId){ // round complete
    cardDisplayEl.innerHTML = '<div style="text-align:center"><strong>Round complete!</strong><p>All cards studied. Start a new round to continue.</p></div>';
    studyControlsEl.style.display='none';
    renderStartNewRound();
    updatePiles();
    return;
  }

  const card = deck.cards.find(c=>c.id===currentId);
  // render card faces
  cardDisplayEl.innerHTML = '';
  const inner = document.createElement('div'); inner.className='card-inner';

  const front = document.createElement('div'); front.className='card-face front';
  if(card.front.image){ const img = document.createElement('img'); img.src=card.front.image; img.alt='front image'; img.style.maxWidth='100%'; img.style.maxHeight='100%'; front.appendChild(img); }
  if(card.front.text){ const p = document.createElement('div'); p.innerHTML = card.front.text; front.appendChild(p); }

  const back = document.createElement('div'); back.className='card-face back';
  if(card.back.image){ const img = document.createElement('img'); img.src=card.back.image; img.alt='back image'; img.style.maxWidth='100%'; img.style.maxHeight='100%'; back.appendChild(img); }
  if(card.back.text){ const p = document.createElement('div'); p.innerHTML = card.back.text; back.appendChild(p); }

  inner.appendChild(front); inner.appendChild(back);
  cardDisplayEl.appendChild(inner);
  cardDisplayEl.classList.remove('flipped');

  // show controls
  studyControlsEl.style.display='flex';
  flipBtn.disabled=false; correctBtn.disabled=true; againBtn.disabled=true;

  updatePiles();
}

function renderStartNewRound(){
  // remove any previous control buttons created earlier
  document.querySelectorAll('.start-new-round, .try-again').forEach(n=>n.remove());

  // Start a full new round (all cards)
  const startBtn = document.createElement('button'); startBtn.className='btn start-new-round'; startBtn.textContent='Start New Round';
  startBtn.addEventListener('click', ()=>{
    const deck = state.decks.find(d=>d.id===state.activeDeckId);
    if(!deck) return;
    const allIds = deck.cards.map(c=>c.id);
    state.study = { queue: shuffleArray(allIds.slice()), correct: [], again: [] };
    saveState(); renderActiveDeck();
  });
  studyFooterEl.appendChild(startBtn);
}

function updatePiles(){
  // remove existing piles
  document.querySelectorAll('.piles').forEach(n=>n.remove());
  const piles = document.createElement('div'); piles.className='piles';
  const left = document.createElement('div'); left.className='pile'; left.innerHTML = `<h4>Known</h4><div class="known-list">${state.study?state.study.correct.length:0}</div>`;
  const right = document.createElement('div'); right.className='pile'; right.innerHTML = `<h4>Needs Work</h4><div class="again-list">${state.study?state.study.again.length:0}</div>`;
  piles.appendChild(left); piles.appendChild(right);
  studyFooterEl.prepend(piles);
}

function flipCard(){
  if(!state.study || !state.study.queue[0]) return;
  cardDisplayEl.classList.toggle('flipped');
  // enable correct/again only when flipped face-up
  const flipped = cardDisplayEl.classList.contains('flipped');
  correctBtn.disabled = !flipped; againBtn.disabled = !flipped;
}

function markCorrect(){
  if(!state.study || !state.study.queue[0]) return;
  // Require the card to be flipped before marking
  if(!cardDisplayEl.classList.contains('flipped')){
    showInlineMessage('Please flip the card first (press Flip or Space) before marking it Correct.');
    return;
  }
  const id = state.study.queue.shift();
  state.study.correct.push(id);
  saveState(); renderActiveDeck();
} 

function markAgain(){
  if(!state.study || !state.study.queue[0]) return;
  // Require the card to be flipped before marking
  if(!cardDisplayEl.classList.contains('flipped')){
    showInlineMessage('Please flip the card first (press Flip or Space) before marking Needs Work.');
    return;
  }
  const id = state.study.queue.shift();
  state.study.again.push(id);
  state.study.queue.push(id); // re-queue
  saveState(); renderActiveDeck();
}

function showAddCardModal(deckId){
  const template = document.getElementById('add-card-template');
  if(!template) return; // template missing
  const deck = state.decks.find(d => d.id === deckId);
  if(deck.cards.length >= 15){
  alert('This deck already has 15 cards.');
  return;
  }
  const clone = template.content.cloneNode(true);
  const overlay = clone.querySelector('.modal-overlay');
  const modal = clone.querySelector('.modal');
  const form = clone.querySelector('.add-card-form');
  const frontText = form.querySelector('[name="frontText"]');
  const frontImg = form.querySelector('[name="frontImg"]');
  const backText = form.querySelector('[name="backText"]');
  const backImg = form.querySelector('[name="backImg"]');
  const cancelBtn = form.querySelector('[data-action="cancel"]');

  // append to body
  document.body.appendChild(clone);

  // focus first field
  frontText.focus();

  function closeModal(){
    // remove overlay (closest .modal-overlay in DOM)
    const existing = document.querySelector('.modal-overlay');
    if(existing) existing.remove();
    window.removeEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e){ if(e.key === 'Escape') closeModal(); }

  // close when clicking outside modal
  overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeModal(); });
  cancelBtn.addEventListener('click', closeModal);
  window.addEventListener('keydown', onKeyDown);

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const ft = frontText.value.trim();
    const fi = frontImg.value.trim();
    const bt = backText.value.trim();
    const bi = backImg.value.trim();
    if(!ft && !fi && !bt && !bi){ alert('Please add text or an image for at least one side.'); return; }
    const deck = state.decks.find(d=>d.id===deckId);
    if(!deck){ alert('Deck not found'); closeModal(); return; }
    const card = { id: uid('card'), front:{ text: ft || '', image:fi || ''}, back:{ text: bt || '', image: bi || '' } };
    deck.cards.push(card);
    if(state.activeDeckId === deckId){ if(state.study) state.study.queue.push(card.id); }
    saveState(); closeModal(); renderActiveDeck(); renderDecks();
  });
}

// Event bindings
addDeckBtn.addEventListener('click', createDeck);
addCardBtn.addEventListener('click', ()=>{ if(state.activeDeckId) showAddCardModal(state.activeDeckId); });
flipBtn.addEventListener('click', flipCard);
correctBtn.addEventListener('click', markCorrect);
againBtn.addEventListener('click', markAgain);

// Allow keyboard shortcuts: Space=flip, 1=correct, 2=again
window.addEventListener('keydown', (e)=>{
  if(document.activeElement && ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if(e.code === 'Space'){ e.preventDefault(); flipCard(); }
  if(e.key === '1') markCorrect();
  if(e.key === '2') markAgain();
});

// Initialization
(function init(){
  loadState(); renderDecks(); renderActiveDeck();
})();