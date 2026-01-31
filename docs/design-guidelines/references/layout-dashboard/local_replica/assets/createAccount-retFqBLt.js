import{K as e}from"./updateAccount-Be5-UCsl.js";const n=`query getImportedTransactions(
  $first: Int
  $offset: Int
  $includeAccount: Boolean = false
  $includeJournal: Boolean = false
  $id: String
  $accountIds: [String!]
  $transactionStatus: TransactionStatusEnum
  $description: String
  $yodleeType: String
  $startDate: String
  $endDate: String
) {
  transactions(
    first: $first
    offset: $offset
    includeAccount: $includeAccount
    includeJournal: $includeJournal
    id: $id
    accountIds: $accountIds
    transactionStatus: $transactionStatus
    description: $description
    yodleeType: $yodleeType
    startDate: $startDate
    endDate: $endDate
  ) {
    pageInfo {
      hasNextPage
      endCursor
    }
    total
    edges {
      cursor
      node {
        id
        description
        amount
        yodleeType
        date
        ignored
        split
        splitParentId
        splitChildren
        recommendedTransactionType
        recommendedAccount
        organizationId
        accountId
        journalId
        journalLineId
        account @include(if: $includeAccount) {
          id
          name
          type
          type2
        }
        journal @include(if: $includeJournal) {
          id
          notes
          type
          autobooked
          attachmentURL
          propertyId
          unitId
          fixedAssetId
          vendorId
          entityId
          property {
            id
            address1
          }
          unit {
            id
            name
          }
          entity {
            id
            name
          }
          journal_lines {
            id
            type
            amount
            yodleeTransactionId
            account {
              id
              name
              type
              type2
            }
          }
        }
      }
    }
  }
}
`,d={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"getImportedTransactions"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"first"}},type:{kind:"NamedType",name:{kind:"Name",value:"Int"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"offset"}},type:{kind:"NamedType",name:{kind:"Name",value:"Int"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"includeAccount"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},defaultValue:{kind:"BooleanValue",value:!1},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"includeJournal"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},defaultValue:{kind:"BooleanValue",value:!1},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"id"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"accountIds"}},type:{kind:"ListType",type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"transactionStatus"}},type:{kind:"NamedType",name:{kind:"Name",value:"TransactionStatusEnum"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"description"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"yodleeType"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"startDate"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"endDate"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"transactions"},arguments:[{kind:"Argument",name:{kind:"Name",value:"first"},value:{kind:"Variable",name:{kind:"Name",value:"first"}}},{kind:"Argument",name:{kind:"Name",value:"offset"},value:{kind:"Variable",name:{kind:"Name",value:"offset"}}},{kind:"Argument",name:{kind:"Name",value:"includeAccount"},value:{kind:"Variable",name:{kind:"Name",value:"includeAccount"}}},{kind:"Argument",name:{kind:"Name",value:"includeJournal"},value:{kind:"Variable",name:{kind:"Name",value:"includeJournal"}}},{kind:"Argument",name:{kind:"Name",value:"id"},value:{kind:"Variable",name:{kind:"Name",value:"id"}}},{kind:"Argument",name:{kind:"Name",value:"accountIds"},value:{kind:"Variable",name:{kind:"Name",value:"accountIds"}}},{kind:"Argument",name:{kind:"Name",value:"transactionStatus"},value:{kind:"Variable",name:{kind:"Name",value:"transactionStatus"}}},{kind:"Argument",name:{kind:"Name",value:"description"},value:{kind:"Variable",name:{kind:"Name",value:"description"}}},{kind:"Argument",name:{kind:"Name",value:"yodleeType"},value:{kind:"Variable",name:{kind:"Name",value:"yodleeType"}}},{kind:"Argument",name:{kind:"Name",value:"startDate"},value:{kind:"Variable",name:{kind:"Name",value:"startDate"}}},{kind:"Argument",name:{kind:"Name",value:"endDate"},value:{kind:"Variable",name:{kind:"Name",value:"endDate"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"pageInfo"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"hasNextPage"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"endCursor"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"total"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"edges"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"cursor"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"node"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"description"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"amount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"yodleeType"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"date"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"ignored"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"split"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"splitParentId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"splitChildren"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"recommendedTransactionType"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"recommendedAccount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"organizationId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"accountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"journalId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"journalLineId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"account"},arguments:[],directives:[{kind:"Directive",name:{kind:"Name",value:"include"},arguments:[{kind:"Argument",name:{kind:"Name",value:"if"},value:{kind:"Variable",name:{kind:"Name",value:"includeAccount"}}}]}],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type2"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"journal"},arguments:[],directives:[{kind:"Directive",name:{kind:"Name",value:"include"},arguments:[{kind:"Argument",name:{kind:"Name",value:"if"},value:{kind:"Variable",name:{kind:"Name",value:"includeJournal"}}}]}],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"notes"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"autobooked"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"attachmentURL"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"propertyId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"unitId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"fixedAssetId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"vendorId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"entityId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"property"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"address1"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"unit"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"entity"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"journal_lines"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"amount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"yodleeTransactionId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"account"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type2"},arguments:[],directives:[]}]}}]}}]}}]}}]}}]}}]}}],loc:{start:0,end:1866,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:n}}},t={ASSET:"Asset",LIABILITY:"Liability"},m={DEBIT:"DEBIT",CREDIT:"CREDIT"},r={DEBIT:"debit",CREDIT:"credit"},l=50,u={[e.TRANSACTIONS_FETCHING]:"We’re fetching your transactions...",[e.TRANSACTIONS_READY]:"Your first transactions are ready",[e.TRANSACTIONS_ON_THE_WAY]:"Your first transactions are on the way"},s={[e.TRANSACTIONS_FETCHING]:"This first sync takes a few seconds. Once it’s done, you’ll see your expenses, income, and more — all ready to review in the Import Feed.",[e.TRANSACTIONS_READY]:"A portion of your transactions are ready to review now. The rest are still syncing in the background and will be added automatically.",[e.TRANSACTIONS_ON_THE_WAY]:"Your transactions are still syncing in the background. They’ll appear here automatically once we receive them."},i=`mutation createAccount($input: createAccountInput!) {
  createAccount(input: $input) {
    ok
    account {
      id
      name
      type
      type2
      default
      openingBalance
      openingBalanceDate
      mortgagePaymentAmount
      mortgageInterestRate
      mortgagePMIAmount
      mortgageEscrowTransferAmount
      autobookMatchingTransactions
      lastCurrentBalance
      lastCurrentBalanceDate
      nonDepreciable
      importStartDate
      partnerBankAccountId
      partnerName
      aziboAccountId
      inactive
      institutionName
      accountNumberMask
      organizationId
      propertyId
      unitId
      entityId
      mortgageEscrowAccountId
      mortgagePaymentAccountId
      parentAccountId
      createdAt
      updatedAt
    }
  }
}
`,c={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"createAccount"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"input"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"createAccountInput"}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"createAccount"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"Variable",name:{kind:"Name",value:"input"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"ok"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"account"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type2"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"default"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"openingBalance"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"openingBalanceDate"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgagePaymentAmount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgageInterestRate"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgagePMIAmount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgageEscrowTransferAmount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"autobookMatchingTransactions"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"lastCurrentBalance"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"lastCurrentBalanceDate"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"nonDepreciable"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"importStartDate"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"partnerBankAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"partnerName"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"aziboAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"inactive"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"institutionName"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"accountNumberMask"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"organizationId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"propertyId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"unitId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"entityId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgageEscrowAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgagePaymentAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"parentAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"createdAt"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"updatedAt"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:815,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:i}}};export{t as A,l as T,m as Y,c as _,d as a,r as b,u as c,s as d};
//# sourceMappingURL=createAccount-retFqBLt.js.map
