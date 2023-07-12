Drawer.init({
  title: (data) => { return `Word: "${data.word.word}"` },
  getData: async ({ _id }) => {
    var data = {};

    data.word = await getWord(_id);

    var promises = await API.promiseAll({
      getWeekWords: { fn: getWeekWords, params: [data.word.word] },
      getWordKeywordsByWord: { fn: getWordKeywordsByWord, params: [data.word.word] },
      getListingsByWord: { fn: getListingsByWord, params: [data.word.word] }
    });

    data.week_words = promises.getWeekWords;
    data = Object.assign({}, data, promises.getListingsByWord, promises.getWordKeywordsByWord);

    return data;
  },
  renderOverview: (data) => {
    var max = { impressions: 0, visits: 0, orders: 0, revenue: 0, clickthru: 0 }; // no need for conversion, dataset will be too small
    data.week_words.forEach(week_word => {
      if (week_word.impressions > max.impressions) max.impressions = week_word.impressions;
      if (week_word.visits > max.visits) max.visits = week_word.visits;
      if (week_word.orders > max.orders) max.orders = week_word.orders;
      if (week_word.revenue > max.revenue) max.revenue = week_word.revenue;
      if (week_word.clickthru > max.clickthru) max.clickthru = week_word.clickthru;
    });

    var weekSections = ``;
    data.week_words.forEach(week_word => {
      var week = `${week_word.week.substring(5,6)}-${week_word.week.substring(6,8)}-${week_word.week.substring(0,4)}`;
      var weekSectionsBars = ``;
      var weekSectionsHtml = ``;
      weekSectionsBars += `
        <div style="height: 95%; width: 23%; position: relative; bottom: 0; display: inline-block; margin-top: 5%">
          <div style="width: 100%; height: ${100 * (week_word.impressions / (max.impressions+0.01))}%; position: absolute; background-color: #8484ff; bottom: 0">
            <span style="position: absolute; width: 100%; font-size: 10px; text-align: center; top: -14px;">IMPR</span>
            <span style="position: absolute; width: 100%; font-size: 10px; text-align: center; top: -24px; line-height:10px; background-color:white;">${week_word.impressions}</span>
          </div>
        </div>
      `;
      weekSectionsBars += `
        <div style="height: 60%; width: 23%; position: relative; bottom: 0; display: inline-block">
          <div style="width: 100%; height: ${100 * (week_word.visits / (max.visits+0.01))}%; position: absolute; background-color: #ff5757; bottom: 0">
            <span style="position: absolute; width: 100%; font-size: 10px; text-align: center; top: -14px;">VISIT</span>
            <span style="position: absolute; width: 100%; font-size: 10px; text-align: center; top: -24px; line-height:10px; background-color:white;">${week_word.visits}</span>
          </div>
        </div>
      `;
      weekSectionsBars += `
        <div style="height: 80%; width: 23%; position: relative; bottom: 0; display: inline-block">
          <div style="width: 100%; height: ${100 * (week_word.revenue / (max.revenue+0.01))}%; position: absolute; background-color: #48b848; bottom: 0">
            <span style="position: absolute; width: 100%; font-size: 10px; text-align: center; top: -14px;">REV</span>
            <span style="position: absolute; width: 100%; font-size: 10px; text-align: center; top: -24px; line-height:10px; background-color:white;">$${week_word.revenue.toFixed(0)}</span>
          </div>
        </div>
      `;
      weekSectionsBars += `
        <div style="height: 60%; width: 23%; position: relative; bottom: 0; display: inline-block">
          <div style="width: 100%; height: ${100 * (week_word.clickthru / (max.clickthru+0.01))}%; position: absolute; background-color: #ed9900; bottom: 0">
            <span style="position: absolute; width: 100%; font-size: 10px; text-align: center; top: -14px;">CLICK</span>
            <span style="position: absolute; width: 100%; font-size: 10px; text-align: center; top: -24px; line-height:10px; background-color:white;">${(week_word.clickthru * 100).toFixed(2)}%</span>
          </div>
        </div>
      `;

      weekSections += `
        <div class="card" style="width: 150px; display: inline-block; height: 160px; position: relative; overflow: visible; margin-top: 16px;">
          <span style="text-align: center; position: absolute; top: -23px; left:0; width: 100%;">${week}</span>
          ${weekSectionsBars}
        </div>
      `;
    });

    var html = `
      <div class="row" style="height: 100%;">
        <div class="scroller" style="overflow-x: scroll; overflow-y: hidden; width: 100%; height: 100%; white-space: nowrap; font-size: 0">
          ${weekSections}
        </div>
      </div>
    `;

    return html;
  },
  tabs: [
    {
      name: 'keywords',
      render: (data) => {
        if (data.sortedKeywordMax.clickthru > 0.07) data.sortedKeywordMax.clickthru = 0.07;

        var html = '';
        data.sortedKeywords.forEach(keywordObj => {
          var keywordBolded = keywordObj.keyword.split(' ');
          keywordBolded = keywordBolded.map(word => {
            if (word == data.word.word) return `<b style="color:purple; font-weight: 600;">${word}</b>`;
            return word;
          });
          keywordBoldedHtml = keywordBolded.join(' ');

          html += `
            <div class="row">
              <div class="card" style="max-width: 100%">
                ${keywordBoldedHtml}
                <div style="width: 95%; position: relative; height: 17px;">
                  <div style="height: 100%; width: ${100 * (keywordObj.impressions / (data.sortedKeywordMax.impressions + 0.01))}%; background-color: #8484ff; line-height:13px;">
                    <span style="overflow: visible; white-space: nowrap; padding-left: 4px; color: #ddd; font-size: 10px;">${keywordObj.impressions} impressions</span>
                  </div>
                </div>

                <div style="width: 60%; position: relative; height: 17px;">
                  <div style="height: 100%; width: ${100 * (keywordObj.visits / (data.sortedKeywordMax.visits + 0.01))}%; background-color: #ff5757; line-height:13px;">
                    <span style="overflow: visible; white-space: nowrap; padding-left: 4px; color: #ddd; font-size: 10px;">${keywordObj.visits} visits</span>
                  </div>
                </div>

                <div style="width: 80%; position: relative; height: 17px; ${(keywordObj.revenue == 0) ? 'display:none;' : ''}">
                  <div style="height: 100%; width: ${100 * (keywordObj.revenue / (data.sortedKeywordMax.revenue + 0.01))}%; background-color: #48b848; line-height:13px;">
                    <span style="overflow: visible; white-space: nowrap; padding-left: 4px; color: ${(keywordObj.revenue) ? '#ddd' : '#999'}; font-size: 10px;">$${keywordObj.revenue} revenue</span>
                  </div>
                </div>

                <div style="width: 100%; position: relative; height: 17px;">
                  <div style="height: 100%; width: ${100 * (keywordObj.clickthru / (data.sortedKeywordMax.clickthru + 0.01))}%; background-color: #ed9900; line-height:13px;">
                    <span style="overflow: visible; white-space: nowrap; padding-left: 4px; color: #ddd; font-size: 10px;">${(keywordObj.clickthru * 100).toFixed(2)}% clickthru</span>
                  </div>
                </div>

              </div>
            </div>
          `;
        });
        return html;
      }
    },
    { 
      name: 'listings',
      render: (data) => {
        if (data.listingsMax.clickthru > 0.07) data.listingsMax.clickthru = 0.07;

        var html = '';
        data.listings.forEach(listing => {
          var listingShortTitle = listing.title.substring(0, 140);
          var listingShortTitleMatch = listing.title.split(' ').map(word => {
            cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
            if (cleanWord.toLowerCase() == data.word.word) return `<b style="font-weight:600;color:purple">${word}</b>`;
            return word;
          });
          var listingLink = `<a href="${listing.url}" target="_blank">${listingShortTitleMatch.join(' ')}</a>`;

          var tagsHTML = ``;
          listing.tags.forEach(tag => {
            var matchedTagArray = tag.split(' ').map(word => {
              if (word.toLowerCase() == data.word.word) return `<b style="font-weight:600;color:purple">${word}</b>`;
              return word;
            });
            tagsHTML += `
              <div style="display: inline-block; font-size: 11px; background-color:#b9deff; color: #444; padding:2px 5px; margin: 0px 3px 3px 0px; border-radius: 3px;">${matchedTagArray.join(' ')}</div>
            `;
          });

          html += `
            <div class="row">
              <div class="card" style="max-width: 100%">
                ${listingLink}

                <div style="font-size:0">${tagsHTML}</div>

                <div style="width: 95%; position: relative; height: 17px;">
                  <div style="height: 100%; width: ${100 * (listing.impressions / (data.listingsMax.impressions + 0.01))}%; background-color: #8484ff; line-height:13px;">
                    <span style="overflow: visible; white-space: nowrap; padding-left: 4px; color: #ddd; font-size: 10px;">${listing.impressions} impressions</span>
                  </div>
                </div>

                <div style="width: 60%; position: relative; height: 17px;">
                  <div style="height: 100%; width: ${100 * (listing.visits / (data.listingsMax.visits + 0.01))}%; background-color: #ff5757; line-height:13px;">
                    <span style="overflow: visible; white-space: nowrap; padding-left: 4px; color: #ddd; font-size: 10px;">${listing.visits} visits</span>
                  </div>
                </div>

                <div style="width: 80%; position: relative; height: 17px; ${(listing.revenue == 0) ? 'display:none;' : ''}">
                  <div style="height: 100%; width: ${100 * (listing.revenue / (data.listingsMax.revenue + 0.01))}%; background-color: #48b848; line-height:13px;">
                    <span style="overflow: visible; white-space: nowrap; padding-left: 4px; color: ${(listing.revenue) ? '#ddd' : '#999'}; font-size: 10px;">$${listing.revenue.toFixed(2)} revenue</span>
                  </div>
                </div>

                <div style="width: 100%; position: relative; height: 17px;">
                  <div style="height: 100%; width: ${100 * (listing.clickthru / (data.listingsMax.clickthru + 0.01))}%; background-color: #ed9900; line-height:13px;">
                    <span style="overflow: visible; white-space: nowrap; padding-left: 4px; color: #ddd; font-size: 10px;">${(listing.clickthru * 100).toFixed(2)}% clickthru</span>
                  </div>
                </div>

              </div>
            </div>
          `;
        });

        return html;
      }
    }
  ],
});