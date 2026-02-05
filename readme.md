Where AI saved time.

    AI was really helpful in the beginning. Having a base layout
    of my HTML and CSS, especially because it used root to have all my
    base colors. Another note I want to make, is that I struggle with 
    generating code, especially with naming conventions and knowing where to 
    place functions and methods. So I appreaciate having a frame work for my
    Javascript. 

At least one AI bug you identified and how you fixed it.

    inner.HTML for filling out cards, I opted for template, which was what
    AI recommended when I questioned it about using inner.HTML for editing large body
    of text.

A code snippet you refactored for clarity.

    I left of trying to fix this, both for accessibility purposes and clarity. Because
    these buttons wouldn't do anything when clicked unless the answer had been revealed, 
    but you wouldn't know it without playing around. Very frustrating as I've tried adding
    an inline message and tried an alert, neither were working. (as of 4:46pm EST, so, I 
    decided to try Windsurf ), and it gave less insite to the whole file and connecting file,
    so that was unhelpful to finding what connecting factor was preventing the InlineMessage,
    so I ran it through ChatGPT, and I had to run the prompt twice, and it is because github
    added a gaurd to prevent the buttons from ever being triggered, and so they would never show
    because the state of being flipped was already triggered, because that was the only way
    to have access to the buttons?! Well, that was a long spiral of fighting code that I was trying
    to refactor. 

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

One accessibility improvement you added.

    Was trying to improve the alerts and inlines to the buttons so users
    would know when an action was needed. 

What prompt changes improved AI output.

    I'm not sure I understand the question.


AI Prompt/Challenge Design Rubric:

-App supports multiple decks. Each deck has cards with front/back text.
-Create, edit, delete decks and cards.
-Study mode: flip cards, next/previous, shuffle.
-Search/filter within a deck by keyword.
-Persist data using LocalStorage (decks, cards, last active deck).
-Responsive layout; basic accessibility (labels, focus, keyboard navigation).
-Clean, readable UI.