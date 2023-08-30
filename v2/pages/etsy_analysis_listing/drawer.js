Drawer.init({
  title: (data) => { 
    var html = '';
    if (data.listing.product_line && data.listing.nickname) {
      html = `${data.listing.product_line}: <i style="font-weight:400">${data.listing.nickname}</i>`;
    } else {
      html = `Listing: "${data.listing.listing_id}"`;
    }
    html += `
      <button class="primary small" onclick='updateListingModal("${data.listing.listing_id}", "${data.listing.product_line}", "${data.listing.nickname}");'>
        Edit
      </button>
      <a href="https://www.etsy.com/your/shops/CustomFamilyGifts/tools/listings/${data.listing.listing_id}" target="_blank">
        <button class="primary small" onclick='javascript:void(0)'>
          Etsy
        </button>
      </a>
    `;
    return html;
  },
  getData: async ({ _id }) => {
    var data = {};

    data.listing = await getListing(_id);
    if (!data.listing.product_line) data.listing.product_line = '';
    if (!data.listing.nickname) data.listing.nickname = '';

    data.listing_wordsObj = await getListingWords(data.listing.listing_id);
    data.listing_words = data.listing_wordsObj.statsByWords;
    data.listing_week = data.listing_wordsObj.byWeek;
    data.listing_week_max = data.listing_wordsObj.statsByWeekMax;
    data.listing_total = data.listing_wordsObj.statsTotal;

    data.listing_words_sorted = [];
    Object.keys(data.listing_words).forEach(key => {
      data.listing_words[key].word = key;
      data.listing_words_sorted.push(data.listing_words[key]);
    });

    data.listing_words_sorted.sort((a, b) => {
      return (a.visits < b.visits) ? 1 : -1;
    });

    data.seo = seoAnalysis(data.listing, data.listing_words);

    console.log('seo', data.seo);

    return data;
  },
  renderOverview: (data) => {
    var html = `
      ${rendeStyleSEO()}
      <div class="row" style="">
        <div class="links" style="position: absolute; top: -50px; right: 0; width: 100px; text-align: right; padding: 8px;">
          <div>
            <a target="_blank" href="${data.listing.url}">Etsy link</a>
          </div>
          <div>
            <a target="_blank" href="https://www.etsy.com/your/shops/CustomFamilyGifts/tools/listings/sort:title,order:ascending,stats:true/${data.listing.listing_id}">Etsy edit</a>
          </div>
        </div>
      </div>

      <div class="row" style="">
        ${renderTitleSEO(data.seo.title, data.seo.desc)}
        ${renderTagsSEO(data.seo.tags)}
      </div>
    `;

    return html;
  },
  tabs: [
    {
      name: 'words',
      render: (data) => {
        var tableHeader = `
          <thead>
            <tr>
              <th>impress</th>
              <th>visits</th>
              <th>clickthru</th>
              <th>orders</th>
              <th>rev</th>
            </tr>
          </thead>
        `;
        var tableRows = '';

        // cumulative
        tableRows += `
          <tr>
            <td style="white-space: nowrap"><b>*all words*</b></td>
            <td style="white-space: nowrap">👁️${shortNumber(data.listing_total.impressions)}</td>
            <td style="white-space: nowrap">👆${shortNumber(data.listing_total.visits)}</td>
            <td style="white-space: nowrap">🎯${((data.listing_total.visits * 100) / data.listing_total.impressions).toFixed(2)}%</td>
            <td style="white-space: nowrap">📦${data.listing_total.orders}</td>
            <td style="white-space: nowrap">$${shortNumber(data.listing_total.revenue.toFixed(2))}</td>
          </tr>
        `;

        tableRows += renderWeeklyRow(data.listing_week, data.listing_week_max);

        data.listing_words_sorted.forEach(wordObj => {
          tableRows += `
            <tr>
              <td style="white-space: nowrap">${wordObj.word}</td>
              <td style="white-space: nowrap">👁️${shortNumber(wordObj.impressions)}</td>
              <td style="white-space: nowrap">👆${shortNumber(wordObj.visits)}</td>
              <td style="white-space: nowrap">🎯${((wordObj.visits * 100) / wordObj.impressions).toFixed(2)}%</td>
              <td style="white-space: nowrap">📦${wordObj.orders}</td>
              <td style="white-space: nowrap">$${shortNumber(wordObj.revenue.toFixed(2))}</td>
            </tr>
          `;
          // the weekly data
          tableRows += renderWeeklyRow([], wordObj);
        });

        var html = `
          <style>
            .rowWeek {
              display: inline-block;
              background-color: #ddd;
              height: 65px;
              width: 65px;
              position: relative;
            }
            .rowWeekLabel {
              width: 100%;
              text-align: center;
            }
            .rowWeekBar {
              position: absolute;
              width: 25%;
              bottom: 0;
            }
            .rowWeekText {
              position: absolute;
              width: 25%;
              top:27px;
              color: white;
              writing-mode: vertical-rl;
              line-height: 17px;
              font-size: 11px !important;
              text-shadow: 0 0 2px black;
            }
          </style>
          
          <table style="margin-top:3px">
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        `;
        return html;
      }
    },
    {
      name: 'keyword',
      render: (data) => {
        return 'hi';
      }
    },
    {
      name: 'product_line',
      render: (data) => {
        var html = `
          <style>
            .wordTag {
              display: inline-block;
              background-color: #e64a4a;
              padding: 2px 3px;
              font-size: 11px !important;
              color: white;
              margin: 0px 0px 2px 4px
            }
          </style>

          <div class="row">
            <h5>desired words</h5>
            <textarea name="desiredwords"></textarea>
          </div>
        `;

        // duplicated words - same listing
        var wordCounts = countWords(data.listing.title, data.listing.description, data.listing.tags);
        var dupeWords = ``;
        Object.keys(wordCounts).forEach(key => {
          if (wordCounts[key] > 1) {
            var opacity = '1';
            if (wordCounts[key] < 3) opacity = '0.5';
            if (wordCounts[key] < 4 && wordCounts[key] > 2) opacity = '0.75';
            dupeWords += `
            <div class="wordTag" style="opacity:${opacity}">${key} ×${wordCounts[key]}</div>
          `;
          }
        });
        html += `
          <div class="row">
            <h5>duplicated words</h5>
            <div style="font-size:0">
              ${dupeWords}
            </div>
          </div>
        `;

        Render.fullListings.forEach(listing => {
          if (listing.product_line == data.listing.product_line && listing.listing_id != data.listing.listing_id) {
            // other listings, same product line
            console.log(listing.product_line, listing.title);
            var dupeWords = ``;
            var wordCounts2 = countWords(listing.title, listing.description, listing.tags);
            console.log(listing.nickname, wordCounts);

            Object.keys(wordCounts2).forEach(word2 => {
              Object.keys(wordCounts).forEach(word => {
                if (word2 == word) dupeWords += `
                  <div class="wordTag">${word2}</div>
                `;
              });
            });

            html += `
            <div class="row">
              <h5>${listing.product_line}: ${listing.nickname}</h5><span> also has</span>
              <div style="font-size:0">
                ${dupeWords}
              </div>
            </div>
            `;
          }
        });

        // duplicated words - other listing

        // desired words - textarea... maybe extras?
        return html;
      }
    }
  ],
});

function renderWeeklyRow(weeksArr, maxes) {
  var rows = ``;
  if (typeof maxes != 'object') throw new Error('maxes should be obj');
  if (maxes.max_impressions == undefined) throw new Error('maxes needs max_impressions key');
  if (maxes.max_visits == undefined) throw new Error('maxes needs max_visits key');
  if (maxes.max_revenue == undefined) throw new Error('maxes needs max_revenue key');
  if (maxes.max_clickthru == undefined) throw new Error('maxes needs max_clickthru key');

  weeksArr.forEach(week => {
    rows += `
      <div class="rowWeek">
        <div style="height: ${((week.impressions/maxes.max_impressions)*95)}%; left:0; background-color: #8484ff" class="rowWeekBar">
        </div>
        <div class="rowWeekText" style="left:0">${shortNumber(week.impressions)}</div>

        <div style="height: ${((week.visits/maxes.max_visits)*60)}%;; left:25%; background-color:#ff5757" class="rowWeekBar">
        </div>
        <div class="rowWeekText" style="left:25%">${shortNumber(week.visits)}</div>

        <div style="height: ${((week.revenue/maxes.max_revenue)*80)}%;; left:50%; background-color:#48b848" class="rowWeekBar">
        </div>
        <div class="rowWeekText" style="left:50%">${shortNumber(week.revenue)}</div>

        <div style="height: ${((week.clickthru/maxes.max_clickthru)*60)}%;; left:75%; background-color:#ed9900" class="rowWeekBar">
        </div>
        <div class="rowWeekText" style="left:75%">${(week.clickthru*100).toFixed(2)}%</div>

        <div class="rowWeekLabel">${week.week.substring(4,6)}-${week.week.substring(6,8)}</div>
      </div>
    `;
  });

  var html = `
    <tr>
      <td colspan="99" style="border-top: none; white-space: nowrap; padding: 0;">
        <div style="width: 100%; overflow-x: auto; height: 100%; max-width: 568px;">
          ${rows}
        </div>
      </td>
    </tr>
  `;
  return html;
}

function updateListingModal(listing_id, product_line, nickname) {
  Modal.renderEdit({
    fields: [
      { name: 'listing_id', type: 'hidden', value: listing_id },
      { name: 'product_line', type: 'text', required: true, instructions: 'associate multiple listings to one design', value: product_line },
      { name: 'nickname', type: 'text', required: true, instructions: 'short name to identify this listing among product line', value: nickname }
    ],
    title: 'hello',
    submit: async (formData) => {
      console.log('formData', formData);
      var result = await updateListing(formData.listing_id, formData.product_line, formData.nickname);
      console.log('submitresult', result);
    },
    onSuccess: async (response) => {
      Drawer.reload();
      Render.try('main',  null, true);
    }
  });
}

function rendeStyleSEO() {
  var html = `
    <style>
      button.seobox > div {
        font-size: 1.00em !important;
        font-weight: 400;
        line-height: 12px;
        text-align: right;
      }
      button.seobox {
        margin: 1px 2px;
        padding: 0px 1px;
        height: 25px;
        font-size: 9px !important;
      }
      #drawerOverview .tagseoParent {
        height: 27px;
        font-size: 0 !important;
        white-space: nowrap;
        background-color: #ef000070;
        display: inline-block;
        margin: 1px 2px;
      }
      #drawerExtra {
        text-align: right;
        left: -260px;
        width: 250px;
        overflow-x: visible;
      }
      #drawerOverview {
        padding: 2px 3px;
        height: 208px;
        overflow-y: auto;
      }
      .novisits {
        opacity: 0.5 !important;
      }
    </style>
  `;
  return html;
}

function renderTitleSEO(titleSEO, descSEO) {
  var html = ``;
  titleSEO.forEach(word => {
    var title = `TITLE: "${word.word}"`;
    if (word.impressions) title += `\n👁️${shortNumber(word.impressions)}`;
    if (word.visits) title += `\n👆${shortNumber(word.visits)}`;
    if (word.orders) title += `\n📦${shortNumber(word.orders)}`;
    if (word.revenue) title += `\n$${shortNumber(word.revenue)}`;

    html += `
      <button class="primary small seobox ${(!word.visits) ? 'novisits': ''}" title='${title}'>
        <div style="display:none">👁️${shortNumber(word.impressions)}</div>
        <div style="${(!word.visits) ? 'opacity:0;' :''}">👆${shortNumber(word.visits)} ${(word.orders) ? '📦'+word.orders: ''}</div>
        <div style="display:none">🎯${((word.visits * 100) / word.impressions).toFixed(2)}%</div>
        <div style="text-align: left; text-transform: capitalize; font-weight: 400;">${word.word}</div>
      </button>
    `;
  });

  descSEO.forEach(word => {
    var title = `DESC: "${word.word}"`;
    if (word.impressions) title += `\n👁️${shortNumber(word.impressions)}`;
    if (word.visits) title += `\n👆${shortNumber(word.visits)}`;
    if (word.orders) title += `\n📦${shortNumber(word.orders)}`;
    if (word.revenue) title += `\n$${shortNumber(word.revenue)}`;

    html += `
      <button class="tertiary small seobox ${(!word.visits) ? 'novisits': ''}" title='${title}'>
        <div style="display:none">👁️${shortNumber(word.impressions)}</div>
        <div style="${(!word.visits) ? 'opacity:0;' :''}">👆${shortNumber(word.visits)} ${(word.orders) ? '📦'+word.orders: ''}</div>
        <div style="display:none">🎯${((word.visits * 100) / word.impressions).toFixed(2)}%</div>
        <div style="text-align: left; text-transform: capitalize; font-weight: 400;">${word.word}</div>
      </button>
    `;
  });

  return html;
}

function renderTagsSEO(tagsSEO) {
  var html = ``;
  tagsSEO.forEach((tag, i) => {
    var title = `TAG: "${tag.tag}"`;
    var wordHtml = ``;
    tag.tagwords.forEach(word => {
      wordHtml += `
      <button class="secondary small seobox ${(!word.visits) ? 'novisits': ''}">
        <div style="display:none">👁️${shortNumber(word.impressions)}</div>
        <div style="${(!word.visits) ? 'opacity:0;' :''}">👆${shortNumber(word.visits)} ${(word.orders) ? '📦'+word.orders: ''}</div>
        <div style="display:none">🎯${((word.visits * 100) / word.impressions).toFixed(2)}%</div>
        <div style="text-align: left; text-transform: capitalize; font-weight: 400;">${word.word}</div>
      </button>
      `;
    });

    html += `
      <div class="tagseoParent" title="Tag ${i+1}">
        ${wordHtml}
      </div>
    `;
  });
  return html;
}

function shortNumber(number) {
  number = +number;
  var decimal = number.toFixed(2).replace('.00','');
  var isDecimal = decimal.includes('.');
  var abs = Math.abs(number);
  if (isDecimal) {
    if (abs < 10) return `${number.toFixed(2)}`;
    if (abs < 100) return `${number.toFixed(1)}`;
    if (abs < 1000) return `${number.toFixed(0)}`;
    if (abs >= 1000) {
      if (abs > 999999) {
        var m = number / 1000000;
        return `${m.toFixed(2)}m`;
      }

      var k = number / 1000;
      return `${k.toFixed(1)}k`;
    }
  } else {                      
    if (abs < 1000) return `${number}`;
    if (abs >= 1000) {
      if (abs > 999999) {
        var m = number / 1000000;
        return `${m.toFixed(2)}m`;
      }
      var k = number / 1000;
      return `${k.toFixed(1)}k`;
    }
  }
  console.log('failed to short '+number);
  throw new Error('shortNumberFail');
}

function countWords(titleText, descText, tags) {
  console.log(tags);
  var title = textToSEO(titleText);
  var descSplit = descText.split(' ');
  var desc_len = 0;
  var descArr = [];
  descSplit.forEach(word => {
    if (desc_len < 170) descArr.push(word);
    desc_len += (1 + word.length);
  });
  var descText = descArr.join(' ');
  var desc = textToSEO(descText);
  var wordCounts = {};
  console.log(title, desc, tags);
  title.forEach(word => {
    if (!wordCounts[word]) wordCounts[word] = 0;
    wordCounts[word]++;
  });
  desc.forEach(word => {
    if (!wordCounts[word]) wordCounts[word] = 0;
    wordCounts[word]++;
  });
  tags.forEach(tag => {
    tag.split(' ').forEach(word => {
      if (!wordCounts[word]) wordCounts[word] = 0;
      wordCounts[word]++;
    });
  })

  // merge plural words
  Object.keys(wordCounts).forEach(word => {
    if (word.charAt(word.length-1) == 's') {
      // loop through wordCounts again, looking for non-plural version
      var singularFound = null;
      Object.keys(wordCounts).forEach(word2 => {
        if (word.length > 2 && word.substring(0, word.length-1) == word2) {
          console.log('singular found', word2);
          singularFound = word2;
        }
      });
      if (singularFound) {
        wordCounts[singularFound] += wordCounts[word];
        delete wordCounts[word];
      }
    }
  });

  return wordCounts;
}