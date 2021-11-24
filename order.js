API.load = (urlParams) => {
  Render.loading('main');
  API.call({
    cacheMS: 4000,
    method: 'v2-getCustomerOrder',
    onSuccess: (data) => {
      $('#main').html(Render.try('main',data));
      selectInitialProof();
    },
    onFailure: (data) => {
      console.log('order on failure');
      $('#main').html(`
        <div class="row">
          <p>Unable to locate order.</p>
          <p>If your order is very new, please try back in a few minutes</p>
          <p>Otherwise, reach out to our support team</p>
        </div>
      `);
    }
  });
};

Render.main = (data) => {
  var result = `
    ${Render.try('header', data)}
    <span id="top">&nbsp;</span><!-- this span for anchor otherwise can't see h3-->
    <h3>Order Details</h3>
    <div class="row">
      ${Render.try('orderStatus', data)}
      ${Render.try('digitalDownload', data)}
      ${Render.try('orderInfo', data)}
      ${Render.try('items', data)}
      ${Render.try('shipping', data)}
    </div>

    <span id="proofs">&nbsp;</span><!-- this span for anchor otherwise can't see h3-->
    <h3>Proofs</h3>
    ${Render.try('proofs', data)}
    ${Render.try('proofThumbs', data)}

    <span id="messages">&nbsp;</span><!-- this span for anchor otherwise can't see h3-->
    <h3>Messages${data.pipeline.toLowerCase().includes('proof sent') ? ' 👇 Approve a proof':''}</h3>
    ${Render.try('responseForm', data)}
    <h3 style="font-size: 0.95em;">Message History</h3>
    ${Render.try('messages', data)}
  `;
  return result;
};

Render.messages = (data) => {
  var result = `
    <style>
      .message {
        width: calc(100% - 60px);
        background-color: white;
        padding: 17px 16px 12px 16px;
        border: 1px solid #ddd;
        margin-top: 18px;
        position: relative;
        word-break: break-word;
      }
      .messageDate {
        position: absolute;
        left: 50%;
        top: 0;
        width: 120px;
        font-size: 0.8em;
        margin-left: -60px;
        text-align: center;
        background-color:#afafaf;
        color: white;
        border-radius: 15px;
        line-height: 18px;
        top: -11px;
        padding-bottom: 1px;
      }
      .message.them {
        margin-right: 20px;
        border: 2px solid #1976d2;
        border-radius: 5px;
        color: #00478c;
        background-color: #cde6ff;
      }
      .message.us {
        border: 2px solid #f78d73;
        margin-left: 20px;
        border-radius: 5px;
        color: #d74521;
        background-color: #ffece7;
      }
      .message.us .messageDate {
        margin-left: -80px;
      }
      .message img {
        float: right;
        display: inline;
        width: 50px;
        height: 50px;
        margin-right: -20px;
        margin-top: -20px;
      }
      .messageVia {
        display: inline-block;
        position: absolute;
        left: -8px;
        top: -8px;
        text-transform: uppercase;
        background-color: #f78d73;
        color: white;
        font-size: 12px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 10px;
      }
      .message.us .messageVia, .message.us .messageDate {
        background-color: #f78d73;
      }
      .message.them .messageVia, .message.them .messageDate {
        background-color: #1976d2;
      }
      /* hide this */
      .freshdesk_quote, blockquote {
        display: none;
      }
      @media only screen and (max-width: 870px) {
        .messagePrompt {
          line-height: 21px;
          margin-bottom:10px;
          width: calc(100% - 40px);
        }
        .message {
          width: calc(100% - 65px);
          margin-left: 8px;
          border-width: 1px !important;
        }
        .messageDate {
          top: -5px;
          border-width: 1px !important;
        }
        .messageVia {
          font-weight: 400;
        }
      }
    </style>
  `;
  if (data.messages) {
    var sortedMessages = data.messages.sort((a, b) => {
      return (new Date(a.created) < new Date(b.created)) ? 1 : -1;
    });
    sortedMessages.forEach(message => {
      result += `
        <div class="message ${message.from_2}">
          <div class="datetime messageDate">${message.created}</div>
          ${(message.from_2 == 'us') ? `<img src="https://cdn.shopify.com/s/files/1/0060/6725/7434/files/heart.png?v=1607199816" />` : ''}
          ${renderVia(message)}
          ${((message.from == 'CFG' || message.to == 'CFG') && message.subject) ? `<div style="font-weight: 600">${message.subject}</div>` : ''}
          ${message.html}
          ${renderAttachments(message)}
        </div>
      `;
    });
  }
  return result;
};

function renderAttachments(message) {
  var result = ``;
  if (message.attachments && message.attachments.length) {
    message.attachments.forEach((attach, i) => {
      result += `
        <div>• attachment ${i+1} - ${attach.name}</div>
      `;
    });
  }
  return result;
}

function renderVia(message) {
  var result = '';
  if (message.to == 'CFG Etsy' || message.from == 'CFG Etsy') {
    result += `<div class="messageVia">Etsy Message</div>`;
  } else if (message.to == 'CFG SMS' || message.from == 'CFG SMS') {
    result += `<div class="messageVia">SMS</div>`;
  } else if (message.source_name == 'Portal') {
    result += `<div class="messageVia">Order Form</div>`;
  } else {
    result += `<div class="messageVia">Email</div>`;
  }

  return result;
}

Render.header = (data) => {
  var result = `
    <header id="content_header">
      <img id="cfgLogo" src="https://cdn.shopify.com/s/files/1/0060/6725/7434/files/heart.png?v=1607199816">
      <a href="#top" class="button">#${data.orderId_raw}</a>
      <a href="#proofs" class="button">Proofs${(data.auto_proof_files && data.auto_proof_files.length) ? `<span class="countTag">${data.auto_proof_files.length}</span>`: ''}</a>
      <a href="#messages" class="button">messages${(data.messages.length) ? `<span class="countTag">${data.messages.length}</span>` : '' }</a>
    </header>
  `;
  return result;
};

function showMessageForm() {
  $('#messageForm').css({ height: '1%' });
  $('#messageForm').animate({ height: '100%' }, 1500);
  $('#showMessageForm').hide();
  $('#submitMessage').select();
}

function sendMessage(orderId) {
  var value = $('#submitMessage').val();
  $('.messagePrompt.error').hide();
  if (value.trim().length == 0) {
    return $('.messagePrompt.error').text('please write a message before sending').show();
  }
  $('#submitMessageButton').prop('disabled', true);
  $('#submitMessage').prop('disabled', true);
  $('#submitMessageButton').after(`<div id="messageSubmitSpinner" class="spinner primary"></div>`);
  API.call({
    cacheMS: 0,
    method: 'v2-sendCustomerOrderMessage',
    httpMethod: 'POST',
    body: JSON.stringify({
      orderId: orderId,
      message: value
    }),
    onSuccess: (data) => {
      API.clearCache('v2-getCustomerOrder');
      $('#submitMessageButton').prop('true', false).text('Send Another');
      $('#submitMessage').prop('true', false).val('');
      $('#messageSubmitSpinner').remove();
      Render.toast('Message Sent! Will get back to you soon', 1, 3500);
      location.reload();
    },
    onFailure: (data) => {
      $('#submitMessageButton').prop('disabled', false);
      $('#submitMessage').prop('disabled', false);
      $('#messageSubmitSpinner').remove();
      Render.toast('Message Not Sent! something went wrong :( try emailing us instead', -1, 3500);
    }
  });
}

Render.responseForm = (data) => {
  return `
    <style>
      .messagePrompt {
        font-size: 0.8em;
        width: 100%;
        padding-left: 15px;
        opacity; 0.8;
        display: block;
        line-height: 35px;
        margin-top; -15px;
      }
    </style>
    <div>
      <button id="showMessageForm" onclick="showMessageForm();" class="primary">send us a message</button>
    </div>
    <div id="messageForm" style="height:0; overflow: hidden;">
      <span class="messagePrompt" style="font-size: 0.8em;">Ready to approve? Want to request changes? Be sure to mention the letter in your message.</span>
      <span class="messagePrompt error" style="color:red;"></span>

      <textarea id="submitMessage" placeholder="example: I approve B! or I like A, but..."></textarea>
      <button id="submitMessageButton" onclick="sendMessage(${data.orderId_raw})" class="primary">Send Message</button>
    </div>
  `;
}

Render.orderStatus = (data) => {
  // tracking links
  var trackingLinks = ``;
  if (data.printed_order_tracking_url) {
    data.printed_order_tracking_url.forEach((url, i) => {
      trackingLinks += `<p><a target="_blank" href="${url}">Tracking Link${(i > 0) ? i : ''}</a></p>`;
    });
  }
  // download links

  var result = `
    <style>
      .status-tag {
        background-color: #27beb0;
        color: white;
        display: inline-block;
        padding: 6px 14px;
        text-transform: uppercase;
        border-radius: 22px;
      }
    </style>

    <div class="card">
      <div class="section">
        <h5>status</h5>
        <p><div class="status-tag" pipeline="${data.pipeline}">${data.customer_status}</div></p>
        <p>since <span class="datetime">${data.last_pipeline_modified}</span></p>
        ${trackingLinks}
      </div>
    </div>
  `;
  return result;
};

Render.digitalDownload = (data) => {
  if (!data["Needs Digital Art"]) return '';
  if (!data.digital_dl_links) return '';
  // tracking links
  var downloadLinks = ``;
  if (data.digital_dl_links) {
    data.digital_dl_links.split(',').forEach((url, i) => {
      var link = url.trim();
      if (link.indexOf('https:') === 0) {
        downloadLinks += `
        <a target="_blank" href="${url}">
        <button class="primary">💾 Download&nbsp;${(i > 1) ? i : ''}</button></a>
        `;
      }
    });
  }
  // download links

  var result = `
    <div class="card">
      <div class="section">
        <h5>Art Files</h5>
        ${downloadLinks}
      </div>
    </div>
  `;
  return result;
};

Render.orderInfo = (data) => {
  var result = `
    <div class="card">
      <div class="section">
        <h5>order placed by</h5>
        <p>${data.custFirst} ${data.custLast}</p>
        <p>${data.email}</p>
        <h5>on</h5>
        <p class="datetime">${data.created || data.created_shopify_order}</p>
      </div>
    </div>
  `;
  return result;
};

Render.items = (data) => {
  var items = '';
  data.formatted_items.forEach((item) => {
    items += `${Render.try('item',item)}`;
  });
  var result = `
    <div class="card">
      <div class="section">
        <h5>Items</h5>
        ${items}
      </div>
    </div>
  `;
  return result;
};

Render.item = (data) => {
  var result = `
    <p>${data.product} / ${data.size} / ${data.frame}</p>
  `;
  return result;
}

Render.shipping = (data) => {
  // check digital Only
  var hasShipping = false;
  data.formatted_items.forEach((item) => {
    if (item.frame !== 'Digital Only' && item.frame !== 'None') hasShipping = true;

  });
  if (!hasShipping) return `
    <div class="card small">
      <div class="section">
        <h5>ships to</h5>
        <p>no shipping - digital product</p>
      </div>
    </div>
  `;

  var result = `
    <div class="card small">
      <div class="section">
        <h5>ships to</h5>
        <p>${data.shipAddFname} ${data.shipAddLname}</p>
        <p>${data.shipAddStreet1}</p>
        ${(data.shipAddStreet2) ? `<p>${data.shipAddStreet2}</p>` : ''}
        <p>${data.shipAddCity}, ${data.shipAddState}, ${data.shipAddZip}, ${data.shipAddCountry}</p>
      </div>
    </div>
  `;
  return result;
};

Render.proofs = (data) => {
  if (!data.auto_proof_files) return `
    <div class="row"><p>Nothing to show yet.</p></div>
  `;

  // also, check to see if approved
  var chosen_proofs = (!data.chosen_proof) ? [] : data.chosen_proof.split(',').map((item) => {
    return item.trim().toLowerCase();
  });
  data.auto_proof_files = data.auto_proof_files.map((item, i) => {
    var letter = item.filename.split('_')[1].toLowerCase();
    if (chosen_proofs.includes(letter)) {
      item.approved = true;
    }
    return item;
  });

  // look for proof_data to augment this - S3 link & timestamps
  if (data.proof_data) {
    var proofsData = {};
    data.proof_data.split(',').forEach((proofString) => {
      var proofData = proofString.split('|');
      proofsData[proofData[0].trim()] = {
        date: new Date(proofData[1]),
        s3Link: proofData[2]
      };
    });
    data.auto_proof_files = data.auto_proof_files.map((proof) => {
      var letter = proof.filename.split('_')[1];
      if (proofsData[letter]) {
        proof.url = proofsData[letter].s3Link;
        proof.date = proofsData[letter].date;
      }
      return proof;
    });
  }

  // sort the proofs first
  var sortedProofs = data.auto_proof_files.sort((a, b) => {
    return (a.filename > b.filename) ? 1 : -1;
  });

  var result = `
    <style>
      .section {
        position: relative !important;
      }
      .proof_overlay {
        position: absolute;
        background-color:rgba(0,0,0,0.2);
        color: white;
        border-radius: 7px;
        pointer-events: none;
      }
      .proof_overlay.approved {
        background-color: #1abf1a;
      }
      .proof_overlay p {
        font-size: 0.8em;
        line-height: 10px;
        font-weight: 600;
        white-space: nowrap;
      }
      .proof_overlay.top {
        left: 11px;
        top: 11px;
      }
      .proof_overlay.bottom {
        right: 11px;
        bottom: 18px;
      }
      figure {
        position: relative;
      }
      .imageRow {
        justify-content: center;
      }
    </style>
  `;
  result += `<div id="proofsContainer">`;
  sortedProofs.forEach((proof) => {
    result += Render.try('proof', proof);
  });
  result += `</div>`;
  return result;
};

Render.proof = (proof) => {
  var letter = proof.filename.split('_')[1].toLowerCase();
  var text = (proof.approved) ? `✔ ${letter.toUpperCase()}` : `${letter.toUpperCase()}`;
  if (proof.date) text += ` • <span class="datetime">${proof.date}</span>`;
  return `
    <div class="section" proof="${letter}">
      <div class="row imageRow row_${letter}">
        <figure>
          <a href="${proof.url}">
            <img src="${proof.url}" alt="Proof ${letter.toUpperCase()}"/>
          </a>

          <div class="proof_overlay top ${(proof.approved) ? 'approved' : ''}" id="proof_${letter}">
            <p>${text}</p>
          </div>

          <div class="proof_overlay bottom">
            <p>• click to see full •</p>
          </div>
        </figure>
      </div>
    </div>
  `;
}

Render.proofThumbs = (data) => {
  if (!data.auto_proof_files) return ``;

  // also, check to see if approved
  var chosen_proofs = (!data.chosen_proof) ? [] : data.chosen_proof.split(',').map((item) => {
    return item.trim().toLowerCase();
  });
  data.auto_proof_files = data.auto_proof_files.map((item, i) => {
    var letter = item.filename.split('_')[1].toLowerCase();
    if (chosen_proofs.includes(letter)) {
      item.approved = true;
    }
    return item;
  });

  // look for proof_data to augment this - S3 link & timestamps
  if (data.proof_data) {
    var proofsData = {};
    data.proof_data.split(',').forEach((proofString) => {
      var proofData = proofString.split('|');
      proofsData[proofData[0].trim()] = {
        date: new Date(proofData[1]),
        s3Link: proofData[2]
      };
    });
    data.auto_proof_files = data.auto_proof_files.map((proof) => {
      var letter = proof.filename.split('_')[1];
      if (proofsData[letter]) {
        proof.url = proofsData[letter].s3Link;
        proof.date = proofsData[letter].date;
      }
      return proof;
    });
  }

  // sort the proofs first
  var sortedProofs = data.auto_proof_files.sort((a, b) => {
    return (a.filename > b.filename) ? -1 : 1;
  });

  var css = `
    <style>
      a.proofThumb {
        width: 22%;
        margin: 9px;
        text-align: center;
        text-transform: uppercase;
        font-size: 12px;
        position: relative;
        text-decoration: none !important;
      }
      a.proofThumb label {
        display: block;
        background-color: #ccc;
        color: white;
        font-size: 14px;
      }
      a.proofThumb.approved label {
        background-color: #1abf1a;
      }
      a.proofThumb img {
        outline: none;
        display: block;
        border: 3px dashed #ddd;
        border-bottom: none;
        box-sizing: border-box;
      }
      a.proofThumb.selected img {
        border-color: #999;
        border-style: solid;
        border-bottom: none;
      }
      a.proofThumb.selected.approved img {
        border-color: #1abf1a;
      }
      a.proofThumb.selected label {
        background-color: #999;
      }
      a.proofThumb.selected.approved label {
        background-color: #1abf1a;
      }
      div.proofSelectedCaret {
        border-bottom: 8px solid #999;
        border-right: 25px solid transparent;
        border-left: 25px solid transparent;
        top: -8px;
        left: 50%;
        position: absolute;
        margin-left: -25px;
        display: none;
      }
      a.proofThumb.selected .proofSelectedCaret {
        display: inline-block;
      }
      a.proofThumb.selected.approved .proofSelectedCaret {
        border-bottom: 8px solid #1abf1a;
      }
      @media screen and (max-width: 767px) {
        a.proofThumb {
          width: 31%;
          margin: 7px 3px;
        }
        a.proofThumb label {
          font-size: 10px;
        }
      }
    </style>
  `;

  var htmlProofs = ``;
  sortedProofs.forEach(proof => {
    var letter = proof.filename.split('_')[1].toLowerCase();
    htmlProofs += `
      <a class="proofThumb ${(proof.approved)?'approved':''} thumb_${letter}" letter="${letter}" href="javascript:selectThumb('${letter}');">
        <div class="proofSelectedCaret"></div>
        <img src="${proof.url}" alt="Proof ${letter.toUpperCase()}"/>
        <label>${(!proof.approved)?'Proof ':''}${letter.toUpperCase()}${(proof.approved) ? `&nbsp;&nbsp;✔&nbsp;&nbsp;approved`:''}</label>
      </a>
    `;
  });

  return `
    ${css}
    <div class="row" style="justify-content: center;">${htmlProofs}</div>
  `;
};

var selectThumbInitted = false;
function selectThumb(letter) {
  if (selectThumbInitted) {
    $('#proofsContainer').css({ height: $('.imageRow.row:visible').height() }); // show/hide causes collapse and scroll jump
    // alternate logic, on subsequent thumbs, alternate them all
    $('.imageRow.row').css({
      position: 'absolute',
      left: 0,
      top: 0,
      width: '100%'
    });
  }

  // this happens first time, as it used to.
  $('.proofThumb.selected').removeClass('selected');
  $('.proofThumb.thumb_'+letter).addClass('selected');
  $('.imageRow.row_'+letter).show();
  $('.imageRow').not('.imageRow.row_'+letter).hide();

  selectThumbInitted = true;
}

function selectInitialProof() {
  // look for anchor
  var anchor = `${location.hash}`.split('_')[1];
  if (anchor && anchor.length == 1) {
    return selectThumb(anchor);
  }
  var $first = $('.proofThumb:first');
  var $approved = $('.proofThumb.approved');
  if ($approved.length) {
    return selectThumb($approved.attr('letter'));
  } else {
    return selectThumb($first.attr('letter'));
  }
}
