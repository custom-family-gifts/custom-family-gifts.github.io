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

Render.main = (data) => {
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

    <h3 id="message-history">Messages</h3>
    <div class="section">
      ${Render.try('messages', data)}
    </div>
  `;
  return result;
};

Render.messages = (data) => {
  var result = '';

  data.order_messages.forEach((item) => {
    var msgDate = new Date(item.created);
    var day = msgDate.getDate();
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var month = months[msgDate.getMonth()];
    var year = msgDate.getFullYear();
    var time = solveTimeString(msgDate);

    var messageClass = (item.from == 'You') ? 'you' : 'cfg';
    var subject = (item.subject) ?  `SUBJECT: ${item.subject}<br>` : '';
    result += `
      <div class="message ${messageClass}">
        <div class="message-info">
          <h5 class="sender">${item.from}</h5>

          <div class="message-date">
            <small>
              ${month} ${day}
              <br>${year}
              <br>${time}
            </small>
          </div>
        </div>

        <div class="card fluid">
          <div class="section">
            <small>via ${item.fromSource}</small>

            <div class="main-text">
              <p">${item.subject}${item.html}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  result += `
    <div class="section">
      <div class="replyTitle"><h5>Reply:</h5></div>
        <form id="reply" id="replyForm">
          <textarea class="replyText" form="replyform" placeholder="enter reply here"></textarea>
        </form>
        <button class="replyButton" onclick="testFunc()">Submit</button>
    </div>
  `
  return result;
}

Render.header = (data) => {
  var result = `
    <header id="content_header">
      <img id="cfgLogo" src="https://cdn.shopify.com/s/files/1/0060/6725/7434/files/heart.png?v=1607199816">
      <a href="#top" class="button" style="margin-left:60px;">#${data.orderId_raw}</a>
      <a href="#proofs" class="button">Proofs</a>
      <a href="#message-history" class="button">Messages</a>
      <!--<a href="#message-history" class="button">Messages</a>-->
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
function ticketItemString(data) {
  var string = '';
  string += `${data.custFirst} ${data.custLast},`;
  string += `${data.email},`;
  string += `${data.orderId_raw}`;

  return string;
}

function testFunc() {

  var replyText = convertReply($("textarea").val());
  var replyObj = {replyText: `"${replyText}"`};
  // API.call({
  //   method: 'v2-customerReply',
  //   package: JSON.stringify(replyJSON),
  //   onFailure:
  //   console.log('customer reply fail');
  //     $('#main').html(`
  //       <div class="row">
  //         <p>Unable to process reply.</p>
  //         <p>check your code</p>
  //       </div>
  //     `);
  // });
  console.log(`PARSED TEXT: = ${replyText}`);
  }

function solveTimeString(date) {
  var hour = date.getHours();
  var ampm = (hour > 11) ? `pm` : `am`;
  hour = `${date.getHours() === 0 || date.getHours() === 12 ? '12' : (date.getHours() + 24) % 12}`;
  var min = `${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`;
  return result = `${hour}:${min}${ampm}`;
}

var autoExpand = function (field) {//function to auto grow textarea

	field.style.height = 'inherit';// Reset field height

	var computed = window.getComputedStyle(field);// Get the computed styles for the element

	var height = parseInt(computed.getPropertyValue('border-top-width'), 10)// Calculate the height
	             + parseInt(computed.getPropertyValue('padding-top'), 10)
	             + field.scrollHeight
	             + parseInt(computed.getPropertyValue('padding-bottom'), 10)
	             + parseInt(computed.getPropertyValue('border-bottom-width'), 10);

	field.style.height = height + 'px';
};

document.addEventListener('input', function (event) {
	if (event.target.tagName.toLowerCase() !== 'textarea') return;
	autoExpand(event.target);
}, false);

function convertReply(reply) {
	var input_str = reply.trim(); //store input
	var counter;

  if(input_str.length > 0){
	  var	output_html = "<p>"; //begin by creating paragraph
    for(counter = 0; counter < input_str.length; counter++){
			switch (input_str[counter]){
				case '\n':
					if (input_str[counter+1] === '\n'){
						output_html += `</p><br><p>`;
						counter++;
					}
					else output_html += "<br>";
					break;

				case ' ':
					if(input_str[counter-1] != ' ' && input_str[counter-1] != '\t')
						output_html += " ";
					break;

				case '\t':
					if(input_str[counter-1] != '\t')
						output_html += " ";
					break;

				case '&':
					output_html += "&amp;";
					break;

				case '"':
					output_html += "&quot;";
					break;

				case '>':
					output_html += "&gt;";
					break;

				case '<':
					output_html += "&lt;";
					break;

				default:
					output_html += input_str[counter];
			}
		}
		output_html += "</p>"; //finally close paragraph
	}
  return output_html;
}
