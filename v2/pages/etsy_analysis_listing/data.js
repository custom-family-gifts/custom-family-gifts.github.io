async function getListing(_id) {
  var listing = await API.gcf('v3-mdb', {
    body: JSON.stringify({
      op: 'find',
      db: 'etsy_analyze',
      col: 'listing',
      q: { _id: _id }
    })
  });
  return listing.records[0];
}

async function updateListing(listing_id, product_line, nickname) {
  if (!listing_id) throw new Error('missing listing_id');
  if (product_line) product_line = product_line.toLowerCase().replace(/ /g, '_');
  if (nickname) nickname = nickname.toLowerCase();

  var result = await API.gcf(`v3-mdb`, {
    body: JSON.stringify({
      op: 'updateVerify',
      db: 'etsy_analyze',
      col: 'listing',
      q: { listing_id: +listing_id },
      doc: {
        product_line: product_line,
        nickname: nickname
      }
    })
  });
  return result.records[0];
}

async function getListingWords(listing_id) {

  var weeks = await API.gcf('v3-mdb', {
    body: JSON.stringify({
      op: 'find',
      db: 'etsy_analyze',
      col: 'week',
      q: { task_search_analysis: { $ne: true } },
      per: 200
    })
  });
  var excludeWeeks = { $and: [] };
  weeks.records.forEach(week => {
    excludeWeeks.$and.push({ week: { $ne: week.string }});
  });


  var words = await API.gcf('v3-mdb', {
    body: JSON.stringify({
      op: 'find',
      db: 'etsy_analyze',
      col: 'week_listing_word',
      q: { listing_id: +listing_id, $and: excludeWeeks.$and },
      per: 20000
    })
  });

  console.log('words', words);

  // tally up the word week data
  // also toally by week
  var statsByWords = {};
  var statsByWeek = {};
  var statsTotal = { impressions: 0, visits: 0, orders: 0, revenue: 0 };
  words.records.forEach(record => {
    if (!statsByWords[record.word]) statsByWords[record.word] = { impressions: 0, visits: 0, orders: 0, revenue: 0, byWeek: [] };
    if (record.visits > record.impressions) record.impressions = records.visits;

    statsByWords[record.word].byWeek.push({
      impressions: record.impressions,
      visits: record.visits,
      orders: record.orders,
      revenue: record.revenue,
      week: record.week
    });
    statsByWords[record.word].impressions += record.impressions;
    statsByWords[record.word].visits += record.visits;
    statsByWords[record.word].orders += record.orders;
    statsByWords[record.word].revenue += record.revenue;

    // week totals
    if (!statsByWeek[record.week]) statsByWeek[record.week] = { impressions: 0, visits: 0, orders: 0, revenue: 0 };
    statsByWeek[record.week].impressions += record.impressions;
    statsByWeek[record.week].visits += record.visits;
    statsByWeek[record.week].orders += record.orders;
    statsByWeek[record.week].revenue += record.revenue;

    // total totals
    statsTotal.impressions += record.impressions;
    statsTotal.visits += record.visits;
    statsTotal.orders += record.orders;
    statsTotal.revenue += record.revenue;
  });

  console.log('statsByWords', statsByWords);

  // count max for each word
  Object.keys(statsByWords).forEach(word => {
    if (statsByWords[word].max_impressions == undefined) {
      // initialize
      statsByWords[word].max_impressions = 0;
      statsByWords[word].max_visits = 0;
      statsByWords[word].max_orders = 0;
      statsByWords[word].max_revenue = 0;
      statsByWords[word].max_clickthru = 0;
    }
    statsByWords[word].byWeek.forEach(week => {
      week.clickthru = 0;
      if (week.impressions > 0) week.clickthru = week.visits / week.impressions;
      if (week.impressions > statsByWords[word].max_impressions) statsByWords[word].max_impressions = week.impressions;
      if (week.visits > statsByWords[word].max_visits) statsByWords[word].max_visits = week.visits;
      if (week.orders > statsByWords[word].max_orders) statsByWords[word].max_orders = week.orders;
      if (week.revenue > statsByWords[word].max_revenue) statsByWords[word].max_revenue = week.revenue
      if (week.clickthru > statsByWords[word].max_clickthru) statsByWords[word].max_clickthru = week.clickthru;
    });
  });

  // sort byweek data
  var byWeek = [];
  Object.keys(statsByWeek).forEach(weekStr => {
    statsByWeek[weekStr].week = weekStr;
    byWeek.push(statsByWeek[weekStr]);
  });
  byWeek.sort((a, b) => {
    return (+a.week < +b.week) ? 1 : -1;
  });

  // count max for each week
  var statsByWeekMax = { max_impressions: 0, max_visits: 0, max_orders: 0, max_revenue: 0, max_clickthru: 0 };
  Object.keys(statsByWeek).forEach(weekStr => {
    statsByWeek[weekStr].clickthru = 0;
    if (statsByWeek[weekStr].impressions > 0) statsByWeek[weekStr].clickthru = statsByWeek[weekStr].visits / statsByWeek[weekStr].impressions;
    if (statsByWeek[weekStr].impressions > statsByWeekMax.max_impressions) statsByWeekMax.max_impressions = statsByWeek[weekStr].impressions;
    if (statsByWeek[weekStr].visits > statsByWeekMax.max_visits) statsByWeekMax.max_visits = statsByWeek[weekStr].visits;
    if (statsByWeek[weekStr].orders > statsByWeekMax.max_orders) statsByWeekMax.max_orders = statsByWeek[weekStr].orders;
    if (statsByWeek[weekStr].revenue > statsByWeekMax.max_revenue) statsByWeekMax.max_revenue = statsByWeek[weekStr].revenue;
    if (statsByWeek[weekStr].clickthru > statsByWeekMax.max_clickthru) statsByWeekMax.max_clickthru = statsByWeek[weekStr].clickthru;
  });

  return { 
    statsByWords,
    byWeek,
    statsByWeekMax,
    statsTotal
  }; 
}

function seoAnalysis(listing, listing_words) {
  var title_array = textToSEO(listing.title);
  var descSplit = listing.description.split(' ');
  var desc_len = 0;
  var descArr = [];
  descSplit.forEach(word => {
    if (desc_len < 170) descArr.push(word);
    desc_len += (1 + word.length);
  });
  var desc = descArr.join(' ');
  var description_array = textToSEO(desc);
  console.log(title_array);
  console.log(description_array);
  console.log(listing_words);

  //analyze title
  var title_results = [];
  var title_words = {};
  title_array.forEach(word => {
    if (!title_words[word]) title_words[word] = 0; // initialize
    title_words[word]++;

    var title_result = {
      word: word,
      ocurrence: title_words[word],
      impressions: 0,
      visits: 0,
      orders: 0,
      revenue: 0,
      matches: []
    };

    // cross ref all words
    Object.keys(listing_words).forEach(l_word => {
      if (l_word.length <= word.length && (l_word.length / word.length) > 0.7 && word.includes(l_word)) {
        l_wordObj = listing_words[l_word];
        title_result.matches.push(l_word);
        title_result.impressions += l_wordObj.impressions;
        title_result.visits += l_wordObj.visits;
        title_result.orders += l_wordObj.orders;
        title_result.revenue += l_wordObj.revenue;
      }
    });

    title_results.push(title_result);
  });

  // analyze description
  var desc_results = [];
  var desc_words = {};
  description_array.forEach(word => {
    if (!desc_words[word]) desc_words[word] = 0; // initialize
    desc_words[word]++;

    var desc_result = {
      word: word,
      ocurrence: desc_words[word],
      impressions: 0,
      visits: 0,
      orders: 0,
      revenue: 0,
      matches: []
    };

    // cross ref all words
    Object.keys(listing_words).forEach(l_word => {
      if (l_word.length <= word.length && (l_word.length / word.length) > 0.7 && word.includes(l_word)) {
        l_wordObj = listing_words[l_word];
        desc_result.matches.push(l_word);
        desc_result.impressions += l_wordObj.impressions;
        desc_result.visits += l_wordObj.visits;
        desc_result.orders += l_wordObj.orders;
        desc_result.revenue += l_wordObj.revenue;
      }
    });

    desc_results.push(desc_result);
  });

  // analyze tags
  var tag_results = [];
  listing.tags.forEach(tag => {
    var tagWords = tag.split(' ');
    var tag_result = {
      tag: tag,
      tagwords: [],
    };
    tagWords.forEach(word => {
      var tagword_result = {
        word: word,
        impressions: 0,
        visits: 0,
        orders: 0,
        revenue: 0,
        matches: []
      };

      // cross ref all words
      Object.keys(listing_words).forEach(l_word => {
        if (l_word.length <= word.length && (l_word.length / word.length) > 0.7 && word.includes(l_word)) {
          l_wordObj = listing_words[l_word];
          tagword_result.matches.push(l_word);
          tagword_result.impressions += l_wordObj.impressions;
          tagword_result.visits += l_wordObj.visits;
          tagword_result.orders += l_wordObj.orders;
          tagword_result.revenue += l_wordObj.revenue;
        }
      });
      tag_result.tagwords.push(tagword_result);
    });

    tag_results.push(tag_result);
  });

  console.log(title_results);
  console.log(desc_results);
  console.log(tag_results);
  return {
    title: title_results,
    desc: desc_results,
    tags: tag_results
  };
}

function textToSEO(text) {
  var text_sanitized = text.replace(/:/g, '').replace(/-/g, ' ').replace(/&quot;/g, '').replace(/,/g, '').replace(/\./,'').replace(/™/g, '').replace(/&/g,'').replace(/#39;/g,'');
  text_sanitized = text_sanitized.replaceAll('.','').replace(/\n/g,' ').replace(/\?/g,'');
  var text_array = [];
  text_sanitized.toLowerCase().split(' ').forEach(word => {
    if (word.trim()) text_array.push(word.trim());
  });
  return text_array;
}