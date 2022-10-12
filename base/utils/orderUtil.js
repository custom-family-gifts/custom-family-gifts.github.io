var OrderUtil = {
  renderInternalNotes: (internalNotes) => {
    var result = ``;
    if (!internalNotes) return '';
    var notes = internalNotes;
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
          <div class="note" style="background-color:#f77251">
            <div class="noteHeader">${note.admin} @ <span class="datetime">${note.date}</span></div>
            ${note.message}
          </div>
        `;
      });
      if (oldNote) {
        result += `
          <div class="note" style="background-color:#f77251">
            <div class="noteHeader">old internal note:</span></div>
            ${oldNote}
          </div>
        `;
      }
      return result;
    } catch(e) {
      /* in case formatting gets broken */
    }

    return `
      <div class="note" style="background-color:#f77251">
        <div class="noteHeader">internal notes:</span></div>
        ${notes}
      </div>
    `;
  }
};
