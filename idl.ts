export const IDL = {
  "version": "0.1.0",
  "name": "anchor_nftpawn",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "admin",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "loanAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "deposite",
      "accounts": [
        {
          "name": "loan",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAuthority",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "lendBorrower",
      "accounts": [
        {
          "name": "loan",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "repayBorrower",
      "accounts": [
        {
          "name": "loan",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowAuthority",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowNftAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userNftAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowSolAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "userSolAta",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          },
          {
            "name": "loanAmount",
            "type": "u64"
          },
          {
            "name": "bpsFee",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Loan",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftMint",
            "type": "publicKey"
          },
          {
            "name": "borrower",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "loanDetails",
            "type": {
              "vec": {
                "defined": "LoanDetails"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Escrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "LoanDetails",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "loanId",
            "type": "u64"
          },
          {
            "name": "borrowerPubkey",
            "type": "publicKey"
          },
          {
            "name": "lenderPubkey",
            "type": "publicKey"
          },
          {
            "name": "loanAmount",
            "type": "u64"
          },
          {
            "name": "loanStatus",
            "type": {
              "defined": "LoanStatus"
            }
          },
          {
            "name": "loanTimestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "LoanStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Closed"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "LoanIsActive",
      "msg": "Loan is active somewhere.."
    },
    {
      "code": 6001,
      "name": "BorrowerNotFound",
      "msg": "Borrower not found or not provided.."
    },
    {
      "code": 6002,
      "name": "LoanIsNotActive",
      "msg": "Loan is not active.."
    },
    {
      "code": 6003,
      "name": "MathOverflow",
      "msg": "Math overflow"
    }
  ]
}; 