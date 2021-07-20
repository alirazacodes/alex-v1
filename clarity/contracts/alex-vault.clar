(impl-trait .trait-vault-flat.vault-trait-flat)

(use-trait ft-trait .trait-sip-010.sip-010-trait)
;; (use-trait flash-loan-user-trait .trait-flash-loan-user.flash-loan-user-trait)
;; I haven't change all the trait yet cause trait-flash-loan-user has been refered in a lot files
(use-trait flash-loan-user-trait-mod .trait-flash-loan-user-mod.flash-loan-user-trait-mod)

(define-constant insufficient-flash-loan-balance-err (err u528))
(define-constant invalid-post-loan-balance-err (err u515))
(define-constant user-execute-err (err u101))
(define-constant transfer-one-by-one-err (err u102))
(define-constant transfer-failed-err (err u72))


(define-data-var pre-loan-balance uint u0)
(define-data-var post-loan-balance uint u0)
(define-data-var pre-loan-balances (list 3 uint) (list))
(define-data-var fee-amount uint u0)

(define-read-only (get-balance (token <ft-trait>))
  ;;use https://docs.stacks.co/references/language-functions#ft-get-balance
  (ok u0)
)
;; returns list of {token, balance}
(define-read-only (get-balances)
  ;;Clarity doesn't support loop, so we need to maintain a list of tokens to apply map to get-balance
  ;;See get-pool-contracts and get-pools in fixed-weight-pool
  (ok (list {token: "nothing", balance: u0}))
)

;; flash loan version with flat paramters
(define-public (flash-loan-flat 
                (flash-loan-user <flash-loan-user-trait-mod>) 
                (token1 <ft-trait>)
                (token2 <ft-trait>)
                (token3  (optional <ft-trait>)) 
                (amount1 uint)
                (amount2 uint)
                (amount3 (optional uint)))
  (begin
  ;; TODO: step 0 validate input parameters
    (asserts! (and (is-none token3) (is-none token3)) transfer-one-by-one-err)
  ;; TODO: step 1 transfer tokens to user one by one
    (asserts! (is-ok (transfer-to-user flash-loan-user token1 amount1)) transfer-one-by-one-err)  
    (asserts! (is-ok (transfer-to-user flash-loan-user token2 amount2)) transfer-one-by-one-err)
    (asserts! (is-ok (transfer-to-user flash-loan-user (unwrap-panic token3) (unwrap-panic amount3))) transfer-one-by-one-err)
  ;; TODO: step 2 call user.execute. the one could do anything then pay the tokens back ,see test-flash-loan-user
    (asserts! (is-ok (contract-call? .test-flash-loan-user execute token1 token2 token3 amount1 amount2 amount3 tx-sender)) user-execute-err)
  ;; TODO: step 3 check if the balance is incorrect
    (var-set post-loan-balance (unwrap-panic (contract-call? token1 get-balance tx-sender)))
    (var-set pre-loan-balance (unwrap-panic (element-at (var-get pre-loan-balances) u0)))
    (asserts! (>= (var-get post-loan-balance) (var-get pre-loan-balance)) invalid-post-loan-balance-err)
    (var-set post-loan-balance (unwrap-panic (contract-call? token2 get-balance tx-sender)))
    (var-set pre-loan-balance (unwrap-panic (element-at (var-get pre-loan-balances) u1)))
    (asserts! (>= (var-get post-loan-balance) (var-get pre-loan-balance)) invalid-post-loan-balance-err)
    ;; TODO: having trouble on unwrap-panic token3
    ;; (var-set post-loan-balance (unwrap-panic (contract-call? (unwrap-panic token3) get-balance tx-sender)))
    ;; (var-set pre-loan-balance (unwrap-panic (element-at (var-get pre-loan-balances) u2)))
    ;; (asserts! (>= (var-get post-loan-balance) (var-get pre-loan-balance)) invalid-post-loan-balance-err)
    (ok true)
  )
)


(define-private (transfer-to-user 
                  (flash-loan-user <flash-loan-user-trait-mod>) 
                  (token <ft-trait>)
                  (amount uint)
                  )
  (begin
    (var-set pre-loan-balance (unwrap-panic (contract-call? token get-balance tx-sender)))
    ;; TODO: calculate this fee later
    ;; (var-set fee-amount (calculateFlashLoanFeeAmount amount))
    (print (var-get pre-loan-balance))
    (append (var-get pre-loan-balances) (var-get pre-loan-balance))
    ;;Make sure the token have enough balance to lend
    (asserts! (>= (var-get pre-loan-balance) amount) insufficient-flash-loan-balance-err)
    (asserts! (is-ok (contract-call? token transfer amount (as-contract tx-sender) (contract-of flash-loan-user) none)) transfer-failed-err)  
    (ok true)
  )
)


(define-private (calculateFlashLoanFeeAmount (amount uint))
;;TODO: need to implement Flash loan fee amount, now just leave it 1%
    (/ amount u100)
)

