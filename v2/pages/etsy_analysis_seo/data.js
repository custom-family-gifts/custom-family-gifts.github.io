async function getWordKeywordsByWord(word) {
  var data = {};
  var keywords = await API.gcf('v3-mdb', {
    body: JSON.stringify({
      op: 'find',
      db: 'etsy_analyze',
      col: 'keyword',
      q: { keyword: { $regex: word }},
      s: { impressions: -1 },
      per: 10000, 
    })
  });

  var combinedKeywords = {};
  keywords.records.forEach(keyword => {
    if (keyword.keyword.split(' ').includes(word)) {
      if (!combinedKeywords[keyword.keyword]) combinedKeywords[keyword.keyword] = { impressions: 0, visits: 0, revenue: 0, orders: 0 };
      combinedKeywords[keyword.keyword].impressions += keyword.impressions;
      combinedKeywords[keyword.keyword].visits += keyword.visits;
      combinedKeywords[keyword.keyword].revenue += keyword.revenue;
      combinedKeywords[keyword.keyword].orders += keyword.orders;
    }
  });

  data.sortedKeywords = [];
  data.sortedKeywordMax = { impressions: 0, visits: 0, revenue: 0, clickthru: 0 };
  Object.keys(combinedKeywords).forEach(keyword => {
    combinedKeywords[keyword].keyword = keyword;
    combinedKeywords[keyword].clickthru = combinedKeywords[keyword].visits / combinedKeywords[keyword].impressions;
    if (combinedKeywords[keyword].impressions == 0) combinedKeywords[keyword].clickthru = 0;
    combinedKeywords[keyword].conversion_rate = combinedKeywords[keyword].orders / combinedKeywords[keyword].visits;
    if (combinedKeywords[keyword].visits == 0) combinedKeywords[keyword].conversion_rate = 0;
    // find max
    if (combinedKeywords[keyword].impressions > data.sortedKeywordMax.impressions) data.sortedKeywordMax.impressions = combinedKeywords[keyword].impressions;
    if (combinedKeywords[keyword].visits > data.sortedKeywordMax.visits) data.sortedKeywordMax.visits = combinedKeywords[keyword].visits;
    if (combinedKeywords[keyword].revenue > data.sortedKeywordMax.revenue) data.sortedKeywordMax.revenue = combinedKeywords[keyword].revenue;
    if (combinedKeywords[keyword].clickthru > data.sortedKeywordMax.clickthru) data.sortedKeywordMax.clickthru = combinedKeywords[keyword].clickthru;
    if (combinedKeywords[keyword].impressions > 50 || combinedKeywords[keyword].visits > 1 || combinedKeywords[keyword].revenue > 0) {
      data.sortedKeywords.push(combinedKeywords[keyword]);
    }
  });

  // sort it
  data.sortedKeywords.sort((a, b) => {
    return (a.impressions > b.impressions) ? -1 : 1;
  });
  return data;
}

async function getWord(_id) {
  var word = await API.gcf('v3-mdb', {
    body: JSON.stringify({
      op: 'find',
      db: 'etsy_analyze',
      col: 'word',
      q: { _id: _id }
    })
  });
  return word.records[0];
}

async function getWeekWords(word) {
  var week_word = await API.gcf('v3-mdb', {
    body: JSON.stringify({
      op: 'find',
      db: 'etsy_analyze',
      col: 'week_word',
      q: { word: word },
      s: { week: -1 }
    })
  });
  return week_word.records;
}

async function getListingsByWord(word) {
  var listings = await API.gcf('v3-mdb', {
    body: JSON.stringify({
      op: 'find',
      db: 'etsy_analyze',
      col: 'listing',
      q: { delete: false },
      per: 500, 
    })
  });
  // sort these into keys by listing_id
  var listingsByIds = {};
  listings.records.forEach(listing => {
    listing.impressions = 0;
    listing.visits = 0;
    listing.orders = 0;
    listing.revenue = 0;
    listingsByIds[listing.listing_id] = listing;
  });

  var weekListingWord = await API.gcf('v3-mdb', {
    body: JSON.stringify({
      op: 'find',
      db: 'etsy_analyze',
      col: 'week_listing_word',
      q: { word: word },
      s: { impressions: -1 },
      per: 500, 
    })
  });
  
  for (var i = 0; i < weekListingWord.recordcount; i++) {
    var wlw = weekListingWord.records[i];
    listingsByIds[wlw.listing_id].impressions += wlw.impressions;
    listingsByIds[wlw.listing_id].visits += wlw.visits;
    listingsByIds[wlw.listing_id].revenue += wlw.revenue;
    listingsByIds[wlw.listing_id].orders += wlw.orders;
  }

  var max = { impressions: 0, visits: 0, revenue: 0, clickthru: 0};
  var sortedArray = [];
  for (var listing_id in listingsByIds) {
    if (listingsByIds[listing_id].visits > 0 || listingsByIds[listing_id.impressions > 50]) {
      sortedArray.push(listingsByIds[listing_id]);
      if (listingsByIds[listing_id].impressions > max.impressions) max.impressions = listingsByIds[listing_id].impressions;
      if (listingsByIds[listing_id].visits > max.visits) max.visits = listingsByIds[listing_id].visits;
      if (listingsByIds[listing_id].revenue > max.revenue) max.revenue = listingsByIds[listing_id].revenue;
      listingsByIds[listing_id].clickthru = listingsByIds[listing_id].visits / listingsByIds[listing_id].impressions;
      if (listingsByIds[listing_id].clickthru > max.clickthru) max.clickthru = listingsByIds[listing_id].clickthru;
    } 
  }
  sortedArray.sort((a, b) => {
    return (a.impressions > b.impressions) ? -1 : 1;
  });

  // calculate max
  return {
    listings: sortedArray,
    listingsMax: max
  };
}