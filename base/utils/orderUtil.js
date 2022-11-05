var OrderUtil = {
  css: () => {
    $('head').append(`
      <style>
        .internalNote {
          padding: 4px 8px;
          font-size: 13px;
          word-break: break-word;
          color: white;
          border-radius: 5px;
          background-color: #f77251;
        }
      </style>
    `);
  },
  renderInternalNotes: (internalNotes) => {
    var result = ``;
    if (!internalNotes) return '';
    var notes = internalNotes;

    setTimeout(function() {
      Render.toLocalTime();
      console.log('heyo');
    }, 150);

    try {
      var formattedNotes = [];
      var oldNote = '';
      var barSplit = notes.split('||');
      barSplit.forEach(barSection => {
        if (barSection == '') return;
        var admin = barSection.split('@')[0];
        var date = barSection.split('@')[1].split('!!')[0];
        var endSplit = barSection.split('!!')[1].split('==END==');
        var message = endSplit[0];
        if (endSplit.length == 2) {
          oldNote = endSplit[1].trim();
        }
        formattedNotes.push({
          admin: admin,
          date: date,
          message: message
        });
      });
      formattedNotes.forEach(note => {
        result += `
          <div class="internalNote">
            <div class="internalNoteHeader">${note.admin} @ <span class="datetime">${note.date}</span></div>
            ${note.message}
          </div>
        `;
      });
      if (oldNote) {
        result += `
          <div class="internalNote">
            <div class="internalNoteHeader">old internal note:</span></div>
            ${oldNote}
          </div>
        `;
      }
      return result;
    } catch(e) {
      /* in case formatting gets broken */
    }
    return `
      <div class="internalNote">
        <div class="noteHeader">internal notes:</span></div>
        ${notes}
      </div>
    `;
  }
};

$(() => {
  OrderUtil.css();
});
