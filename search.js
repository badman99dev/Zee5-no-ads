const axios = require('axios');
const { initTokens, authHeaders, mapImages } = require('./config');

const GQL_SEARCH_DOC = `query GetHybridSearchResultsRail($query: String = "" , $lang: [String!] = [] , $genre: [String!] = [] , $type: [String!] = [] , $country: String = "IN" , $translation: String = "en" , $parent: Boolean = false , $ageRating: Int, $autocorrect: Boolean = false , $languages: String = "en" , $userType: UserType!, $restrictContentPlan: String = "" , $actionType: SearchActionType, $planId: String, $profileType: Int, $appVersion: String) { hybridSearchResults(searchQueryInRailInput: { query: $query translation: $translation filters: { lang: $lang genre: $genre type: $type }  country: $country parent: $parent ageRating: $ageRating autoCorrect: $autocorrect languages: $languages userType: $userType restrictContentPlan: $restrictContentPlan actionType: $actionType planId: $planId profileType: $profileType appVersion: $appVersion } ) { queryId total rails { id title originalTitle tags contents { __typename ...movie ...episode ...tvShowDetails } total railSource } } }  fragment image on Image { list cover portrait }  fragment contentPartner on ContentPartner { id name }  fragment movie on Movie { id title originalTitle description image { __typename ...image } duration businessType ageRating releaseDate audioLanguages languages subtitleLanguages assetType assetSubType tags contentPartner { __typename ...contentPartner } }  fragment episode on Episode { id title originalTitle description image { __typename ...image } duration businessType ageRating releaseDate audioLanguages languages subtitleLanguages assetType assetSubType tags episodeNumber tvShow { id title assetSubType } contentPartner { __typename ...contentPartner } }  fragment tvShowDetails on TVShow { id title originalTitle description image { __typename ...image } businessType ageRating audioLanguages languages assetType assetSubType tags contentPartner { __typename ...contentPartner } }`;

async function search(query, lang = 'hi,en') {
  await initTokens();
  const r = await axios.post('https://artemis.zee5.com/artemis/graphql', {
    operationName: 'GetHybridSearchResultsRail',
    query: GQL_SEARCH_DOC,
    variables: {
      query,
      country: 'IN',
      translation: 'en',
      lang: lang.split(','),
      languages: lang,
      userType: 'guest',
      autocorrect: true,
      appVersion: '5.79.9',
      profileType: 1,
      genre: [],
      type: [],
      parent: false,
      restrictContentPlan: '',
    },
  }, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
  return mapImages(r.data);
}

module.exports = { search };
