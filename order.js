API.load = (urlParams) => {
  Render.loading('main');
  API.call({
    cacheMS: 60000, // 60s - customers don't have access to 'live' data for load issues.
    method: 'v2-getCustomerOrder-dev',
    onSuccess: (data) => {
      $('#main').html(Render.try('main',data));
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

Render.main = (data) => {   //added messages section (jack)
  var result = `
    ${Render.try('header', data)}
    <h3 id="top">Order Details</h3>
    <div class="row">
      ${Render.try('orderStatus', data)}
      ${Render.try('digitalDownload', data)}
      ${Render.try('orderInfo', data)}
      ${Render.try('items', data)}
      ${Render.try('shipping', data)}
    </div>

    <h3 id="proofs">Proofs</h3>
    ${Render.try('proofs', data)}

    <h3 id="messages">Messages</h3>
    <div class="section">
      ${Render.try('messages', data)}
    </div>
  `;
  return result;
};

Render.messages = (data) => {//<small style="top: 0;" class="datetime">${item.created}</small>
  var result = '';
  data.order_messages.forEach((item) => {
    var msgDate = new Date(item.created);
    var day = msgDate.getDate();
    switch(day) {
      case 1: day = "1"; break; case 2: day = "2"; break; case 3: day = "3"; break; case 4: day = "4"; break; case 5: day = "5"; break; case 6: day = "6"; break; case 7: day = "7"; break; case 8: day = "8"; break; case 9: day = "9"; break;
    }
    var month = msgDate.getMonth();
    switch(month) {
      case 0: month = "Jan"; break; case 1: month = "Feb"; break; case 2: month = "Mar"; break; case 3: month = "Apr"; break; case 4: month = "May"; break; case 5: month = "Jun"; break; case 6: month = "Jul"; break; case 7: month = "Aug"; break; case 8: month = "Sep"; break; case 9: month = "Oct"; break; case 10: month = "Nov"; break; case 11: month = "Dec"; break;
    }
    var year = msgDate.getFullYear();
    var time = solveTimeString(msgDate);

    if(item.subject == '' || item.subject == null) {//no subject
      if(item.from == 'You') {
        result += `
        <div style="position: absolute; left: 10px; width: 45px;">
          <h5 class="you">${item.from}</h5>
          <div style="position: absolute; top: 3px;">
            <p class="msgs"><small><br>${month} ${day}<br>${year}<br>${time}</small></p>
          </div>
        </div>
        <div class="card fluid" style="
          margin-left: 60px;
        ">
          <div class="section">
            <small style="top: 0;">via ${item.fromSource}</small>
              <div style="padding: 10px; word-break: break-all;"
                <p">${item.html}</p>
              </div>
            </div>
          </div>
        `
      }
      if(item.from != 'You') {
        result += `
        <div style="position: absolute; right: 10px; width: 45px;">
          <h5 class="cfg">${item.from}</h5>
          <div style="position: absolute; top: 3px;">
            <p class="msgs"><small><br>${month} ${day}<br>${year}<br>${time}</small></p>
          </div>
        </div>
        <div class="card fluid" style="
          margin-right: 60px;
        ">
          <div class="section">
            <small style="top: 0;">via ${item.toSource}</small>
              <div style="padding: 10px; word-break: break-all;"
                <p>${item.html}</p>
              </div>
            </div>
          </div>
        `
      }
    }else {//has subject line
      if(item.from == 'You') {
        result += `
        <div style="position: absolute; left: 10px; width: 45px;">
          <h5 class="you">${item.from}</h5>
          <div style="position: absolute; top: 3px;">
            <p class="msgs"><small><br>${month} ${day}<br>${year}<br>${time}</small></p>
          </div>
        </div>
        <div class="card fluid" style="
          margin-left: 60px;
        ">
          <div class="section">
            <small style="top: 0;">via ${item.fromSource}</small>
              <div style="padding: 10px; word-break: break-all;"
                <p>SUBJECT: ${item.subject}<br>${item.html}</p>
              </div>
            </div>
          </div>
        `
      }
      if(item.from != 'You') {
        result += `
        <div style="position: absolute; right: 10px; width: 45px;">
          <h5 class="cfg">${item.from}</h5>
          <div style="position: absolute; top: 3px;">
            <p class="msgs"><small><br>${month} ${day}<br>${year}<br>${time}</small></p>
          </div>
        </div>
        <div class="card fluid" style="
          margin-right: 60px;
        ">
          <div class="section">
            <small style="top: 0;">via ${item.toSource}</small>
              <div style="padding: 10px; word-break: break-all;"
                <p>SUBJECT: ${item.subject}<br><br>${item.html}</p>
              </div>
            </div>
          </div>
        `
      }
    }
  });
  return result;
}

Render.header = (data) => {
  var result = `
    <header id="content_header">
      <img id="cfgLogo" src="https://cdn.shopify.com/s/files/1/0060/6725/7434/files/heart.png?v=1607199816">
      <a href="#top" class="button" style="margin-left:60px;">#${data.orderId_raw}</a>
      <a href="#proofs" class="button">Proofs</a>
      <a href="#messages" class="button">Message</a>
      <!--<a href="#message" class="button">messages</a>-->
    </header>
  `;
  return result;
};

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
        downloadLinks += `<p><a target="_blank" href="${url}">💾 Download Your Art @ 300 DPI${(i > 0) ? i : ''}</a></p>`;
      }
    });
  }
  // download links

  var result = `
    <div class="card">
      <div class="section">
        <h5>Digital Files</h5>
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
        <p class="datetime">${data.created}</p>
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
        line-height: 12px;
        font-weight: bold;
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
    </style>
  `;
  sortedProofs.forEach((proof) => {
    result += Render.try('proof', proof);
  });
  return result;
};

Render.proof = (proof) => {
  var letter = proof.filename.split('_')[1].toLowerCase();
  var text = (proof.approved) ? `✔ ${letter.toUpperCase()}` : `${letter.toUpperCase()}`;
  if (proof.date) text += ` • <span class="datetime">${proof.date}</span>`;
  return `
    <div class="section" proof="${letter}">
      <div class="proof_overlay top ${(proof.approved) ? 'approved' : ''}" id="proof_${letter}">
        <p>${text}</p>
      </div>
      <div class="proof_overlay bottom">
        <p>• click to see full •</p>
      </div>

      <div class="row">

        <figure>
          <a href="${proof.url}">
            <img src="${proof.url}" alt="Proof ${letter.toUpperCase()}"/>
          </a>
        </figure>
      </div>
    </div>
  `;
}

function solveTimeString(date) {
  var digit = date.getHours();
  var ampm = (digit > 11) ? `pm` : `am`;

  switch(digit) {
    case 0: digit = "12"; break; case 13: digit = "1"; break; case 14: digit = "2"; break; case 15: digit = "3"; break; case 16: digit = "4"; break; case 17: digit = "5"; break; case 18: digit = "6"; break;  case 19: digit = "7"; break;case 20: digit = "8"; break;case 21: digit = "9"; break;case 22: digit = "10"; break;case 23: digit = "11"; break;
  }
  var hour = digit;
  var min = `${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`;
  return result = `${hour}:${min}${ampm}`;
}
