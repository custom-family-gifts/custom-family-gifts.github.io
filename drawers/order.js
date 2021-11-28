Drawer.init({
  title: (data) => {
    return `${(data.isPriority) ? '<span style="font-weight:normal">⭐</span> ' : ''}Order #${data.orderId_raw}`;
  },
  apiCall: (params) => {
    if (!params.orderId) throw new Error('Drawer needs orderId');
    var call = {
      method: 'v2-getServiceOrder',
      urlParams: '&orderId='+params.orderId
    };
    return call;
  },
  renderExtra: (data) => {
    var modalFnId1 = Modal.getUniqueId();
    Modal.fns[modalFnId1] = () => {
      // call v2-addOrderInternalNote(orderId, message, admin_key)
      var orderId = data.orderId_raw;
      var message = $('#modal form textarea[name=message]').val();
      var admin_key = Admin.key;
      Modal.editLoading();
      API.call({
        cacheMS: 0,
        method: 'v2-addOrderInternalNote',
        body: JSON.stringify({
          orderId: orderId,
          message: message,
          admin_key: admin_key
        }),
        onSuccess: (data) => {
          Modal.editSuccess();
        },
        onFailure: (data) => {
          Modal.editFailure();
        }
      });
    };

    var modalFnId2 = Modal.getUniqueId();
    Modal.fns[modalFnId2] = () => {
      Modal.renderEdit(data.at_record_id, 'Set Chosen Proof', [
        { name: 'message', required: true, textarea: true, instructions:'auto adds name & date' },
      ], {}, 'orders', Modal.fns[modalFnId1]);
    };

    var html = `<button style="background-color:#f77251;width:90%;color:white;" onclick="Modal.fns[${modalFnId2}]()">add note</button>`;
    html += renderNotes(data);
    return html;
  },
  renderOverview: (data) => {
    return `
      <div class="row" style="position:absolute;top:6px;left:184px;">${renderPipeline(data.pipeline)} ${renderArtist(data.artist)}</div>
      <div style="white-space: nowrap; position: relative; height: 100%;">
        <div class="drawerDiv" style="width:calc(100% - 138px);display:inline-block">
          <div class="row">${renderItems(data.items, data.options)}</div>
          ${renderCustomer(data)}
        </div>
        <div class="drawerDiv" style="position: absolute; top: 0; right: 0; width: 140px;">
          ${renderLinks(data)}
        </div>
        ${renderProofs(data)}
      </div>
    `
  },
  tabs: [
    {
      name: 'main',
      render: (data) => {
        var result = ``;
        if (!data.options) data.options = '';
        var leftColumn = `<div class="column">`;
        var rightColumn = `<div class="column">`;

        var pipelines = getPipelines();
        var approved = pipelines.filter(pipeline => {
          return Boolean(pipeline.toLowerCase().includes('approved'));
        });

        leftColumn += renderTabSection(
          'pipeline',
          `<div style="padding-top: 9px;padding-bottom: 4px;">${renderPipeline(data.pipeline)}</div>`,
          () => {
            Modal.renderEdit(data.at_record_id, 'Set Pipeline', [
              { name: 'pipeline', options: pipelines }
            ], data);
          }
        );

        leftColumn += renderTabSection(
          'addons',
          renderAddons(data),
          () => {
            Modal.renderEdit(data.at_record_id, 'Addons', [
              { name: 'isPriority', label: 'Priority', boolean: true },
              { name: 'Needs Digital Art', label: 'Send Digital', boolean: true },
            ], data);
          }
        );

        leftColumn += renderTabSection(
          'Shipping Details',
          renderShippingAddress(data),
          () => {
            Modal.renderEdit(data.at_record_id, 'Edit Shipping Details', [
              { name: 'shippingChoice', label: 'Shipping Choice', options: ['', 'expedited'], instructions: 'blank = standard' },
              { name: 'shipAddFname', label: 'Ship First Name', required: true },
              { name: 'shipAddLname', label: 'Ship Last Name', required: true },
              { name: 'shipAddStreet1', label: 'Street 1', required: true },
              { name: 'shipAddStreet2', label: 'Street 2' },
              { name: 'shipAddCity', label: 'City', required: true },
              { name: 'shipAddState', label: 'State'},
              { name: 'shipAddZip', label: 'Postal Code' },
              { name: 'shipAddCountry', label: 'Country', reqiored: true, options: ['United States','Canada','Australia','United Kingdom','Germany','France','Ireland','Philippines'] }
            ], data);
          }
        );

        rightColumn += renderTabSection(
          'chosen proof(s)',
          renderChosenProofs(data.chosen_proof),
          () => {
            Modal.renderEdit(data.at_record_id, 'Set Chosen Proof', [
              { name: 'chosen_proof', label: 'Chosen Proof(s)', instructions:'comma separated B, N, X' },
              { name: 'pipeline', options: approved }
            ], data);
          }
        );

        rightColumn += renderTabSection(
          'options',
          `<div style="max-height: 240px; overflow-x: hidden; overflow-y: auto; font-size: 12px;">
            ${data.options.replace(/\n/g, '<br>')}
          </div>`,
          () => {
            Modal.renderEdit(data.at_record_id, 'Edit Shipping Details', [
              { name: 'options', textarea: true },
            ], data);
          }
        );

        leftColumn += `</div>`;
        rightColumn += `</div>`;
        result = leftColumn + rightColumn;
        return result;
      }
    },
    {
      name: (data) => {
        messages = data.messages || [];
        var name = 'messages';
        if (messages.length > 0) name = `${Drawer.renderTabCount(messages.length)} ${name}`
        return name;
      },
      render: (data) => {
        if (!data.messages) data.messages = [];
        var result = '';

        result += `<button disabled>Reproof</button>`

        // SMS stuff
        if (data.custPhoneSanitized) data.custPhoneSanitized = `${data.custPhoneSanitized}`;
        if (!data.custPhoneSanitized) data.custPhoneSanitized = '';
        if (data.custPhoneSanitized.length == 10) data.custPhoneSanitized = '1'+data.custPhoneSanitized;
        if (data.custPhoneSanitized.charAt(0) == '1' && data.custPhoneSanitized.length == 11) {
          var modalFnId1 = Modal.getUniqueId();
          Modal.fns[modalFnId1] = () => {
            // call v2-addOrderInternalNote(orderId, message, admin_key)
            var orderId = data.orderId_raw;
            var message = $('#modal form textarea[name=sms]').val();
            var number = data.custPhoneSanitized;
            Modal.editLoading();
            API.call({
              cacheMS: 0,
              method: 'v2-sendOrderSms',
              body: JSON.stringify({
                orderId: data.orderId_raw,
                message: message,
                number: number
              }),
              onSuccess: (data) => {
                Modal.editSuccess();
              },
              onFailure: (data) => {
                Modal.editFailure('SMS may have been sent. Please do not send again', 10000);
              }
            });
          };
          var modalFnId2 = Modal.getUniqueId();
          Modal.fns[modalFnId2] = () => {
            Modal.renderEdit(data.at_record_id, `Send SMS to ${data.custPhone} for #${data.orderId_raw} `, [
              { name: 'sms', label: 'message', required: true, textarea: true, instructions:'max 150 char', maxLength: 150 },
            ], {}, 'orders', Modal.fns[modalFnId1]);
          };
          result += `<button class="primary" onclick="Modal.fns[${modalFnId2}]()">send sms</button>`;
        }
        result += `<button disabled>send Etsy</button>`;
        result += `<button disabled>reply Email</button>`;

        // zero messages
        if (data.messages.length == 0) {
          result += `<div class="message" style="background-color: #ddd;font-size: 0.9em;">🙈 no messages found in freshdesk</div>`;
        }

        // main notification on messages
        result += `<div class="message" style="background-color: #ddd;font-size: 0.9em;">NOTE: Freshdesk tickets without correct <span style="font-weight:600">order_number</span> will <span style="font-weight:600">not</span> appear here.</div>`;

        // queued etsy
        if (data.queued_etsy_messages && data.queued_etsy_messages.records.length) {
          data.queued_etsy_messages.records.forEach((qe => {
            result += `<div style="opacity:0.6" class="message us" style="background-color: #ddd;font-size: 0.9em;"><b>Queued but unsent Etsy message:</b></br> ${qe.message}</div>`;
          }));
        }

        // orders. messages
        for (var i = data.messages.length-1; i >= 0; i--) {
          var message = data.messages[i];
          result += renderMessage(message, data);
        }

        // etsy notif
        if (data.etsy_receipt_id) {
          result += `<div class="message" style="background-color: #ddd;font-size: 0.9em;">🍊 NOTE: Rarely, The origin etsy request may not appear here or in FD.<br>If the conversation feels like something is missing. Check the Etsy Order Link</div>`;
        }
        return result;
      }
    },
    {
      name: (data) => {
        var name = 'prints';
        if (data.printed_order.length > 0) name = `${Drawer.renderTabCount(data.printed_order.length)} ${name}`;
        return name;
      },
      render: (data) => {
        var result = ``;
        // count expected and actual prints
        var expectedPrints = data.item_count;
        var actualPrinted = (data.printed_order) ? data.printed_order.length : 0;
        if (data.items.toLowerCase().includes('digital only')) {
          result = `<div class="message" style="background-color:#e0ffd1;">Digital Only - nothing to print</div>`;
        } else {
          if (actualPrinted != expectedPrints) {
            result = `<div class="message" style="color: orange; background-color: #ffebc8;">${actualPrinted} of ${expectedPrints} expected items Printed</div>`;
          } else {
            result = `<div class="message" style="background-color:#e0ffd1;">✅ ${actualPrinted} of ${expectedPrints} expected items Printed</div>`;
          }
        }

        if (data.printed_order && data.printed_order.length) {
          data.printed_order.forEach(printed_order => {
            var html = renderPrintedOrder(printed_order);
            result += renderTabSection(`📦 Printed Order ${printed_order.printing_service} : ${printed_order.printer_id}`, html);
          });
        }
        if (data.to_print && data.to_print.length) {
          data.to_print.forEach((to_print, i) => {
            result += renderTabSection(`to print ${to_print.to_print_id} `, renderToPrint(to_print, data));
          });
        }
        if (data.printed_order && data.printed_order.length == 0 && data.to_print && data.to_print.length == 0) {
          result += `<b>to_print</b> or <b>printed_order</b> found`;
        }
        return result;
      },
    },
    {
      name: 'misc',
      render: (data) => {
        var result = `
          <div>_ATID: ${data.at_record_id}</div>
          <div>_id: ${data._id}</div>
          ${Render.button({
            id: 'mdbUpdate',
            text: 'sync latest',
            class: 'primary',
            onclick: `triggerMdbUpdate(${data.orderId_raw})`
          })}
        `;
        return result;
      }
    }
  ]
});

function getPipelines() {
  return [
    'Cancelled',
    'Delivered',
    'HOLD',
    'PRINTED: Check Delivery',
    'APPROVED: Print Me',
    'PROOF SENT: waiting',
    'PROOF READY: Email Cust',
    'PROOF RDY: Review',
    'ART: Done',
    'ART: Proof Me',
    'ART: Re-Proof'
  ];
}

function renderAddons(order) {
  var html = ``;
  if (!order.isPriority) {
    html += `<div>priority: standard</div>`;
  } else {
    html += `<div>⭐ Priority</div>`;
  }
  if (order[`Needs Digital Art`]) {
    html += `<div>📨 Yes Digital</div>`;
    if (order.email_digital_art_sent) html += `<div><span class="datetime">${order.email_digital_art_sent}</span></div>`;
    if (order.digital_dl_links) {
      var linkCount = 0;
      order.digital_dl_links.split(',').forEach((link, i) => {
        if (!link.trim()) return;
        linkCount++;
        html += '<div>';
        html += Render.link(link.trim(), `DL link ${linkCount}`);
        html += '</div>';
      });
    }
  } else {
    html += `<div>digital art: no</div>`;
  }
  return html;
}

function triggerMdbUpdate(orderId) {
  $('button#mdbUpdate').addClass('loading').prop('disabled', true);
  API.call({
    cacheMS: 0,
    method: 'v2-updateMdbOrder',
    body: JSON.stringify({
      orderId: orderId
    }),
    onSuccess: () => {
      Drawer.reload();
      $('button#mdbUpdate').removeClass('loading').prop('disabled', false);
    },
    onFailure: () => {
      $('button#mdbUpdate').removeClass('loading').prop('disabled', false);
      Toast.show('mdbUpdate failed', -1, 5000);
    }
  });
}

function renderChosenProofs(chosen_proofs) {
  if (!chosen_proofs) return `<span>--</span>`;
  var result = ``;
  var chosenProofsArr = chosen_proofs.split(',');
  chosenProofsArr.forEach((letter, i) => {
    result += `
      <span
        class="tag"
        style="background-color:${(i%2==0)?'#00cb00':'#00c4b9'};margin:4px 0px;color:white;display:inline-block"
      >${letter.trim()}</span>`;
  });
  return result;
}

function renderPrintedOrder(printed_order) {
  let html = `<div>created at <span class="datetime">${printed_order.printed_order_created}</span></div>`;
  if (printed_order.date_shipped) {
    html += `<div>shipped on <span class="datetime">${printed_order.date_shipped}</span></div>`;
  }
  if (printed_order.date_delivered) {
    html += `<div>✅ delivered on <span class="datetime">${printed_order.date_delivered}</span></div>`;
  } else if (printed_order.est_date_delivered) {
    html += `<div>est delivery on <span class="datetime">${printed_order.est_date_delivered}</span></div>`;
  }
  html += `status: ${(printed_order.printer_status) ? printed_order.printer_status : 'no status'}`
  if (printed_order.printing_service == 'Gooten') {
    html += `
      <div><a target="_blank" href="https://www.gooten.com/Admin/#/orders-new/${printed_order.printer_id}/summary">${printed_order.printing_service} link</a></div>
    `;
  }
  if (printed_order.printed_proof) html += `<div>printed proof: ${printed_order.printed_proof}</div>`;
  if (printed_order.tracking_url) {
    html += `<div><a target="_blank" href="${printed_order.tracking_url}">${printed_order.carrier} : ${printed_order.tracking}</a></div>`;
  }
  return html;
}

function renderToPrint(to_print, order) {
  var proofs = order.auto_proof_files || [];

  let html = ``;
  html += `<div>${to_print.printer} | ${to_print.print_choice_size} | ${to_print.print_choice_frame}</div>`;
  if (!data.chosen_proof || data.chosen_proof.trim() == '') {
    // solve for select
    var options = ``;
    proofs.forEach(proof => {
      var proofSplit = proof.filename.split('_');
      if (proofSplit.length == 3) {
        var letter = proofSplit[1].toUpperCase();
        options += `<option ${(letter == to_print['2_chosen_proof']) ? 'selected' : ''} value="${letter}">${letter}</option>`;
      }
    });
    if (to_print['2_chosen_proof']) {
      html += `<button class="primary" onclick="">Print ${to_print['2_chosen_proof']}</button>`;
    } else {
      html += `<select onchange="changeChosenProof(this)" to_print_id="${to_print.to_print_id}"><option value="">--</option>${options}</select>`;
      html += Render.button({
        class: "primary",
        disabled: null,
        text: 'print',
        onclick: `setChosenProof(${order.orderId_raw}, ${to_print.to_print_id})`,
        to_print_id: to_print.to_print_id
      });
    }
  }
  return html;
}

function setChosenProof(orderId, to_print_id) {
  if (!orderId || !to_print_id) throw new Error('invalid parameters for setChosenProof');
  var $button = $(`button[to_print_id=${to_print_id}]`);
  var $select = $(`select[to_print_id=${to_print_id}]`);
  if ($button.prop('disabled')) return;
  var letter = $select.val();
  if (!letter) return;

  $button.prop('disabled', true);
  $select.prop('disabled', true);

  API.call({
    cacheMS: 0,
    method: 'v2-setToPrintChosenProof',
    httpMethod: 'post',
    urlParams: `&orderId=${orderId}&to_print_id=${to_print_id}&letter=${letter}`,
    onSuccess: (data) => {
      Drawer.load(Drawer.getParams());
    },
    onFailure: (e) => {
      console.warn(e);
      Toast.show('Something went wrong - Chosen Proof', -1, 5000);
      $button.prop('disabled', false);
      $select.prop('disabled', false);
    }
  });
}

function changeChosenProof(select) {
  var letter = $(select).val();
  var to_print_id = $(select).attr('to_print_id');
  var $button = $(`button[to_print_id=${to_print_id}]`);
  if (letter) {
    $button.prop('disabled', false);
  } else {
    $button.prop('disabled', true);
  }
}

function renderProofs(order) {
  var result = `
    <style>
      ul.proofs {
        padding: 0;
        margin: 5px;
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        overflow-x: auto;
        margin-bottom: 0px;
      }
      ul.proofs li {
        list-style: none;
        display: inline-block;
        position: relative;
        cursor: zoom-in;
      }
      ul.proofs span.letter {
        position: absolute;
        top: 0;
        left: 0;
        color: white;
        background-color: #bbb;
        height: 12px;
        width: 12px;
        font-weight: 600;
        font-size: 10px !important;
        line-height: 12px;
        text-align: center;
      }
      ul.proofs li img {
        max-height: 60px;
        max-width: 60px;
        border: 1px dashed #bbb;
      }
      ul.proofs li.chosen img{
        border: 1px dashed #00cb00;
      }
      ul.proofs li.chosen span.letter {
        background-color: #00cb00;
      }
    </style>

    <ul class="proofs">
  `;
  if (order.auto_proof_files && order.auto_proof_files.length > 0) {
    var proofs = order.auto_proof_files;
    var sortedProofs = proofs.sort((a, b) => {
      return (a.filename.toLowerCase() > b.filename.toLowerCase()) ? -1 : 1;
    });
    var finalsByLetter = {};
    if (order.auto_final_files) {
      order.auto_final_files.forEach(final => {
        var finalSplit = final.filename.split('_');
        if (finalSplit.length == 3 && finalSplit[1].length == 1) {
          finalsByLetter[finalSplit[1].toUpperCase()] = final;
        }
      });
    }
    sortedProofs.forEach((proof, i) => {
      var url = proof.url;
      if (proof.thumbnails && proof.thumbnails.large) {
        url = proof.thumbnails.large.url;
      }
      var letter = '';
      if (proof.filename.split('_').length == 3) {
        letter = proof.filename.split('_')[1].toUpperCase();
      }
      var isChosenProof = false;
      var isSent = false;
      if (order.sent_proofs_record && order.sent_proofs_record.toUpperCase().includes(letter)) isSent = true;
      if (order.chosen_proof && order.chosen_proof.toUpperCase().includes(letter)) isChosenProof = true;
      var thumbUrl = proof.url;
      var final = finalsByLetter[letter] || null;

      if (proof.thumbnails && proof.thumbnails.large) thumbUrl = proof.thumbnails.large.url;
      result += `
        <li onclick="proofModal('${url}', '${(final) ? final.url : ''}', '${letter}', '${(final) ? final.width : ''}', '${(final) ? final.height : ''}')" class="${(isChosenProof) ? 'chosen' : ''}">
          <span class="letter">${letter}</span>
          <img src="${thumbUrl}" />
        </li>
      `;
    });
    result += '</ul>'
  }
  return result;
}

function proofModal(url, finalUrl, letter, finalX, finalY) {
  Modal.render(
    `
      <span>Proof ${letter.toUpperCase()}</span>
      ${(finalUrl) ? ` <a href="${finalUrl}" target="_blank">view final</a>` : ''}
      ${(finalX) ? `${finalX}×${finalY}` : ''}
    `,
    `
      <img src="${url}" />
    `,
    false
  );
}

function renderTabSection(title, html, editFn) { // editFn is a fully envocable function
  var modalId = Modal.getUniqueId();
  if (editFn) {
    Modal.fns[modalId] = () => {
      editFn();
    };
  }
  return `
    <div class="card">
      <div class="card-title">
        ${title}
        ${(editFn) ? `<span class="drawer-card-edit" style="float:right" onclick="Modal.fns[${modalId}]();">⚙</span>` : ''}
      </div>
      ${html}
    </div>
  `;
}

function renderMessage(message, order) {
  var result = `
    <div class="message ${message.from_2} ${(message.isNote) ? 'note' : ''} ${(message.suspect_confidence < 1) ? 'suspect' : ''}">
      <div class="messageBar">
        ${renderFrom(message, order)}
        <a class="fdLink" target="_blank" href="https://customfamilygifts.freshdesk.com/a/tickets/${message.ticket_id}">fd:${message.ticket_id}</a>
        <span class="messageDatetime datetime">${message.created}</span>
      </div>

      <div class="messageContent">
        ${renderSuspect(message)}
        ${message.html}
      </div>
      ${renderAttachments(message)}
    </div>
  `;
  return result;
}

function renderSuspect(message) {
  if (message.suspect_confidence == 1) return '';
  return `
    <div class="suspectBar">
      <b>confidence ${message.suspect_confidence * 100}%</b> matched on [${message.suspect_reasons}]
      <div>does this message belong to this order? yes / no</div>
    </div>
  `;
}

function renderAttachments(message) {
  if (!message.attachments) return '';
  var result = ``;
  message.attachments.forEach(attachment => {
    var url = 'https://customfamilygifts.freshdesk.com/helpdesk/attachments/'+attachment.id;
    if (false && attachment.content_type.includes('image/')) {
      // this solution doesn't currently work. The archived url is time sensitive and cannot be opened in app
      result += `
        <div><img src="${url}"/></div>
      `;
    } else {
      result += `
        <div style="padding:6px 3px;"><a target="_blank" href="${url}">🔗${attachment.name}</a></div>
      `;
    }
  });
  return result;
}

function renderFrom(message, order) {
  var from = message.from;
  if (message.from.toLowerCase() != order.email.toLowerCase() && message.to == 'CFG') {
    if (message.private) {
      from += ` <span style="color:red;font-weight:600;" title="${order.email}">🙈 customer can't see this</span>`;
    } else {
      from += ` <span style="color:red;font-weight:600;" title="${order.email}">🚷 email not from order</span>`;
    }
  }
  if (message.isNote) from = `FD Note ${(message.private_user) ? `from ${message.private_user}` : ''}`;
  if (message.to == 'CFG SMS') from = 'SMS';
  if (message.to == 'CFG Smile') from = '💗 Smile Link';
  return `
    ${renderFromIcon(message)}
    <span class="messageFrom">${from}</span>
  `;
}

function renderFromIcon(message) {
  if (message.isNote) return `<span>👁‍🗨</span>`;
  if (message.to == 'CFG SMS') return `<img src="./assets/sms.png" />`;
  if (message.source_name.toLowerCase() == 'facebook') return `<img src="./assets/facebook.png" style="background-color: white" />`;
  if (message.from == 'CFG Etsy' || message.to == 'CFG Etsy') return `<img src="./assets/etsy.png" />`;
  if (message.source_name.toLowerCase().includes('email')) return `<img src="./assets/gmail.png" />`;
  return '';
}

var MAPCOUNT_NAMES = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18
};
function renderItems(items, options) {
  if (!items) return 'no items';
  if (!options) options = [];
  // returns the map count as well
  var itemsArray = items.split('\n');
  var optionsArray = options.split('\n');
  var mapCountArray = optionsArray.filter(option => {
    if (option.toLowerCase().includes('[map count]:')) {
      return true;
    } else {
      return false;
    }
  });
  var mapCountValues = mapCountArray.map((mapcount => {
    var mapcountArr = mapcount.split('[map count]:');
    if (mapcountArr.length == 2) return mapcountArr[1].trim();
    return null;
  }));

  var result = ``;
  itemsArray.forEach((itemLine, i) => {
    var itemSplit = itemLine.split('/');
    if (itemSplit.length != 3) return result += `<div>${itemLine}</div>`;
    result += `
      <ul class="items">
        <li title="${itemSplit[0]}">${itemSplit[0].split(' ')[0]}</li>
        <li>${itemSplit[1]}</li>
        <li title="${itemSplit[2]}">${itemSplit[2].replace('Canvas Wrap','Canvas Wrp').replace('Black', 'Blk').replace('White','Wh').replace('Walnut','Wal').replace(' Only', '')}</li>
        ${(mapCountValues[i]) ? `<li>${MAPCOUNT_NAMES[mapCountValues[i]] || mapCountValues[i]}M</li>` : ''}
      </ul>
    `;
  });
  return result;
}

function renderPipeline(pipeline) {
  var bgColor = 'black';
  var color = 'white';
  if (!pipeline) {
    pipeline = 'uncategorized';
    bgColor = 'red';
    color = 'white';
  }

  if (pipeline.toLowerCase().includes('hold')) {
    bgColor = '#666';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('re-proof')) {
    bgColor = '#8b46ff';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('art: done')) {
    bgColor = '#20c933';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('proof me')) {
    bgColor = '#fcb400';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('review')) {
    bgColor = '#93e088';
    color = 'black';
  }
  if (pipeline.toLowerCase().includes('email')) {
    bgColor = '#20c933';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('proof sent')) {
    bgColor = '#d0f0fd';
    color = 'black';
  }
  if (pipeline.toLowerCase().includes('approved')) {
    bgColor = '#18bfff';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('printed')) {
    bgColor = '#9cc7ff';
    color = 'black';
  }
  if (pipeline.toLowerCase().includes('delivered')) {
    bgColor = '#999';
    color = 'white';
  }
  if (pipeline.toLowerCase().includes('cancelled')) {
    bgColor = '#bbb';
    color = 'white';
  }
  return `<span class="tag" style="color:${color};background-color:${bgColor}">${pipeline}</span>`;
}

function renderLinks(order) {
  // service view
  var atLinkUrl = `https://airtable.com/appa8QniOsPWSRDEF/tblBu8Y9Hvjwiz2Mm/viwEtrRRKxWAhjgLM/${order.at_record_id}?blocks=hide`;
  if (order.etsy_link && order.etsy_link.length) atLinkUrl = `https://airtable.com/appa8QniOsPWSRDEF/tblBu8Y9Hvjwiz2Mm/viwdXoP1FZhFXT0q0/${order.at_record_id}?blocks=hide`;
  if (order.pipeline.toLowerCase() == 'delivered') atLinkUrl = `https://airtable.com/appa8QniOsPWSRDEF/tblBu8Y9Hvjwiz2Mm/viwaLSolT6dAYWC7f/${order.at_record_id}?blocks=hide`

  var result = `
    <style>
      .drawerDiv .link {
        float: right;
      }
    </style>
    <div>${(order.at_record_id) ? Render.link(atLinkUrl, 'Airtable Link') : ''}</div>
    <div>${(order.customer_order_link) ? Render.link(order.customer_order_link, 'Smile Cust Link') : ''}</div>
    <div>${(order.customer_order_link) ? Render.link(`https://smile.customfamilygifts.com/service_orders?drawer_orderId=${order.orderId_raw}`, 'Smile Link') : ''}</div>
    <div>${(order['order link']) ? Render.link(order['order link'], 'Shopify Link') : ''}</div>
    <div>${(order.etsy_link && order.etsy_link.length) ? Render.link(order.etsy_link[0],'Etsy Link') : ''}</div>
  `;
  return result;
}

function renderOptions(value) {
  var result = ``;
  if (!value) value = '';
  value.split('\n').forEach(row => {
    result += `<br>${row}`
  });
  return `<div style="font-size:0.8em;">${result.substring(4, 999)}</div>`;
}

function renderArtist(artist) {
  var bgColor = 'black';
  var color = 'white';
  if (!artist) return '';

  switch (artist) {
    case 'Janine':
      bgColor = '#20d9d2';
      color = 'white';
    break;
    case 'Johnnica':
      bgColor = '#cdb0ff';
      color = 'black';
    break;
    case 'Deb':
      bgColor = '#3cd04d';
      color = 'white';
    break;
    case 'Ira':
      bgColor = '#ff08c2';
      color = 'white';
    break;
    case 'Glecy':
      bgColor = '#18bfff';
      color = 'white';
    break;
    case 'Eliza':
      bgColor = '#2d7ff9';
      color = 'white';
    break;
    case 'Kamille':
      bgColor = '#fcb400';
      color = 'white';
    break;
    case 'Peter':
      bgColor = '#ffa981';
      color = 'black';
    break;
    case 'Mei':
      bgColor = '#ffdaf6';
      color = 'black';
    break;
    case 'Sarah':
      bgColor = '#ffdaf6';
      color = 'black';
    break;
    case 'Tina':
      bgColor = '#444444';
      color = 'black';
    break;

  }
  return `<span class="tag" style="color:${color};background-color:${bgColor}">${artist}</span>`;
}

function renderCustomer(order, editable = true) {
  var modalFnId = Modal.getUniqueId();
  Modal.fns[modalFnId] = () => {
    Modal.renderEdit(order.at_record_id, 'Edit Customer', [
      { name: 'custFirst', label: 'First Name', required: true, instructions:'used in emails - please keep updated' },
      { name: 'custLast', label: 'Last Name', required: true },
      { name: 'email', required: true },
      { name: 'custPhone' }
    ], order);
  };

  var result = `
    <span>🙋‍♀️ ${order.custFirst} ${order.custLast}
      ${(editable) ? `<span class="drawer-card-edit" style="float:none;margin-left:5px;vertical-align:top;" onclick="Modal.fns[${modalFnId}]();">⚙</span>`:''}
    </span>
  `;
  result += `<br>📧 ${order.email}`;
  if (order.custPhone) result += `<br>📞 ${order.custPhone}`;
  // if (order.shipAddress) result += `<br><div class="small" style="display:block;">🚛 ${order.shipAddress.replace(/\n/g,'<br>')}</div>`;
  return result;
}

function renderShippingAddress(order) {
  if (!order.shipAddress) return '';
  return `
    <div>
      ${(order.shippingChoice) ? `🚀 <b style="font-weight:600;color:orange">${order.shippingChoice}</b><br>`:'Standard Shipping<br>' }
      ${order.shipAddress.replace(/\n/g,'<br>')}
    </div>
  `
}

function renderNotes(order) {
  var result = ``;

  // other orders
  if (order.other_orders && order.other_orders.length) {
    order.other_orders.forEach(oo => {
      result += `
        <div class="note otherOrder" style="background-color:white;" onclick="Drawer.load({orderId:${oo.orderId_raw}});">
          <div class="noteHeader" style="color:#444;margin-bottom:5px;">
            #${oo.orderId_raw}
            <span class="datetime" style="float:right;font-size:12px;">${oo.created_shopify_order}</span>
          </div>
          ${renderPipeline(oo.pipeline)}
          <div style="font-size:12px; text-align: center; color: #444; padding-top: 5px;">same customer - click to view</div>
        </div>
      `;
    });
  }

  result += renderInternalNotes(order);
  if (order.print_note) {
    result += `<div class="note" style="background-color:#1976d2"><div class="noteHeader">Print Note:</div>${order.print_note}</div>`;
  }
  // message notes
  if (order.messages && order.messages.length) {
    // reverse the messages
    var reversedMessages = JSON.parse(JSON.stringify(order.messages));
    reversedMessages.sort((a, b) => {
      return (new Date(a) > new Date(b)) ? 1 : -1;
    });
    reversedMessages.forEach(message => {
      if (message.isNote) {
        result += `
          <div class="note" style="background-color:#ffc829">
            <div class="noteHeader">FD Note ${(message.private_user) ? message.private_user : ''} ${message.created.substring(0,10)}</div>
            ${message.html}
          </div>
        `;
      }
    });
  }
  return result;
}

function renderInternalNotes(order) {
  var result = ``;
  if (!order['Internal - newest on top please']) return '';
  var notes = order['Internal - newest on top please'];
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
