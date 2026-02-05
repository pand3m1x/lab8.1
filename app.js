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
  if(state.decks.length>=15){ alert('Maximum of 15 decks reached.'); return; }
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
  // remove existing start btn if present
  const existing = document.querySelector('.start-new-round'); if(existing) existing.remove();
  const btn = document.createElement('button'); btn.className='btn start-new-round'; btn.textContent='Start New Round';
  btn.addEventListener('click', ()=>{
    // new round includes cards that were marked correct previously (re-include) and again (they should already be empty queue)
    const deck = state.decks.find(d=>d.id===state.activeDeckId);
    if(!deck) return;
    const allIds = deck.cards.map(c=>c.id);
    state.study = { queue: shuffleArray(allIds.slice()), correct: [], again: [] };
    saveState(); renderActiveDeck();
  });
  studyFooterEl.appendChild(btn);
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
  const id = state.study.queue.shift();
  state.study.correct.push(id);
  saveState(); renderActiveDeck();
}

function markAgain(){
  if(!state.study || !state.study.queue[0]) return;
  const id = state.study.queue.shift();
  state.study.again.push(id);
  state.study.queue.push(id); // re-queue
  saveState(); renderActiveDeck();
}

function showAddCardModal(deckId){
  const overlay = document.createElement('div'); overlay.style.position='fixed'; overlay.style.inset=0; overlay.style.background='rgba(0,0,0,0.5)'; overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center'; overlay.style.zIndex='9999';
  const modal = document.createElement('div'); modal.style.background='white'; modal.style.padding='1rem'; modal.style.borderRadius='8px'; modal.style.width='min(720px,95%)'; modal.style.maxHeight='90vh'; modal.style.overflow='auto';
  modal.innerHTML = `
    <h3>Add Card</h3>
    <label>Front text<br><textarea id="front-text" rows="3" style="width:100%"></textarea></label>
    <label>Front image URL (optional)<br><input id="front-img" style="width:100%"></label>
    <label>Back text<br><textarea id="back-text" rows="3" style="width:100%"></textarea></label>
    <label>Back image URL (optional)<br><input id="back-img" style="width:100%"></label>
    <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.5rem">
      <button class="btn" id="cancel-card">Cancel</button>
      <button class="btn" id="save-card">Save Card</button>
    </div>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById('cancel-card').addEventListener('click', ()=> overlay.remove());
  document.getElementById('save-card').addEventListener('click', ()=>{
    const ft = document.getElementById('front-text').value.trim();
    const fi = document.getElementById('front-img').value.trim();
    const bt = document.getElementById('back-text').value.trim();
    const bi = document.getElementById('back-img').value.trim();
    if(!ft && !fi && !bt && !bi){ alert('Please add text or an image for at least one side.'); return; }
    const deck = state.decks.find(d=>d.id===deckId);
    if(!deck){ alert('Deck not found'); overlay.remove(); return; }
    const card = { id: uid('card'), front:{ text: ft || '', image:fi || ''}, back:{ text: bt || '', image: bi || '' } };
    deck.cards.push(card);
    // If this deck is active and study exists, add to queue (push to end)
    if(state.activeDeckId === deckId){ if(state.study) state.study.queue.push(card.id); }
    saveState(); overlay.remove(); renderActiveDeck(); renderDecks();
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