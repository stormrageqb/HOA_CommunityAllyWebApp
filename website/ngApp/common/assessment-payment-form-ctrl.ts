﻿declare var dwolla: any;
declare var PeriodicPaymentFrequencies: Ally.PeriodicPaymentFrequency[];

namespace Ally
{
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    export class AssessmentPaymentFormController implements ng.IController
    {
        static $inject = ["$http", "SiteInfo", "$rootScope", "$sce", "$timeout", "$q", "$scope"];

        isLoading_Payment: boolean = false;
        isLoadingDwolla: boolean = false;
        wePayAssessmentCreditCardFeeLabel: string;
        wePayAssessmentAchFeeLabel: string;
        errorPayInfoText: string;
        payerPaysAchFee: boolean;
        isWePaySetup: boolean;
        hasAssessments: boolean;
        assessmentFrequency: number;
        allyAppName: string;
        isWePayAutoPayActive: boolean;
        nextAutoPayText: string;
        autoPayFrequencyLabel: string;
        assessmentFrequencyInfo: PeriodicPaymentFrequency;
        paymentInfo: MakePaymentRequest;
        myRecentPayments: ElectronicPayment[];
        historicPayments: RecentPayment[];
        assessmentAmount: number;
        nextPaymentText: string;
        knowsNextPayment: boolean;
        paragonCheckingLast4: string;
        paragonCardLast4: string;
        paragonPaymentParams: string;
        showParagon: boolean = false;
        showParagonCheckingSignUpModal: boolean = false;
        showParagonCreditSignUpModal: boolean = false;
        paragonSignUpInfo: ParagonPayerSignUpInfo;
        paragonSignUpError: string;
        paragonPaymentMessage: string;
        paragonCardTokenizedUrl: string;
        paragonCardTokenizationMessage: string;
        dwollaSignUpInfo: CreateDwollaUser = {
            dateOfBirth: "",
            ssnLast4: "",
            ssnFull: "",
            streetAddress: new FullAddress()
        };
        isWePayPaymentActive: boolean = false;
        isDwollaEnabledOnGroup: boolean = false;
        isStripeEnabledOnGroup: boolean = false;
        isDwollaReadyForPayment: boolean = false;
        isDwollaUserAccountVerified: boolean;
        hasDwollaFundingSource: boolean;
        dwollaUserStatus: string;
        userFullName: string;
        userEmail: string;
        shouldShowDwollaAddAccountModal: boolean = false;
        shouldShowDwollaModalClose: boolean = false;
        dwollaPaymentMessage: string;
        hasComplexPassword: boolean = false;
        didAgreeToDwollaTerms: boolean = false;
        dwollaFundingSourceName: string;
        dwollaFundingSourceIsVerified: boolean;
        dwollaFeePercent: number = 0.5;
        dwollaStripeMaxFee: number = 5;
        dwollaFeeAmountString: string;
        dwollaDocUploadType: string = "license";
        dwollaDocUploadFile: File = null;
        dwollaDocUploadMessage: string;
        dwollaBalance: number = -1;
        dwollaBalanceMessage: string;
        isDwollaIavDone: boolean = false;
        shouldShowMicroDepositModal: boolean = false;
        dwollaMicroDepositAmount1String: string = "0.01";
        dwollaMicroDepositAmount2String: string = "0.01";
        shouldShowOwnerFinanceTxn: boolean = false;
        shouldShowDwollaAutoPayArea: boolean = true;
        shouldShowStripeAutoPayArea: boolean = true;
        currentDwollaAutoPayAmount: number | null = null;
        stripeAutoPayAmount: number | null;
        customFinancialInstructions: string;
        stripeApi: any;
        stripeElements: any;
        stripeCardElement: any;
        usersStripeBankAccountHint: string;
        stripeAchFeeAmountString: string;
        hasMultipleProviders = false;
        allowDwollaSignUp: boolean = false;
        stripePaymentSucceeded = false;
        userHasStripeAutoPay = false;
        shouldAllowStripeAutoPay = false;
        hasStripePendingMicroDeposits = false;


        /**
         * The constructor for the class
         */
        constructor( private $http: ng.IHttpService,
            private siteInfo: Ally.SiteInfoService,
            private $rootScope: ng.IRootScopeService,
            private $sce: ng.ISCEService,
            private $timeout: ng.ITimeoutService,
            private $q: ng.IQService,
            private $scope: ng.IScope )
        {
        }


        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        $onInit()
        {
            this.showParagon = false;//this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.paragonPaymentParams = `&BillingAddress1=${encodeURIComponent( "900 W Ainslie St" )}&BillingState=Illinois&BillingCity=Chicago&BillingZip=60640&FirstName=${encodeURIComponent( this.siteInfo.userInfo.firstName )}&LastName=${encodeURIComponent( this.siteInfo.userInfo.lastName )}`;
            this.paragonCheckingLast4 = this.siteInfo.userInfo.paragonCheckingLast4;
            this.paragonCardLast4 = this.siteInfo.userInfo.paragonCardLast4;

            this.isWePayPaymentActive = this.siteInfo.privateSiteInfo.isWePayPaymentActive;

            // Disable to Stripe testing
            if( this.siteInfo.publicSiteInfo.groupId === 28 )
                this.isWePayPaymentActive = false;
            this.isWePayPaymentActive = false;

            const shouldShowDwolla = false; //AppConfigInfo.dwollaPreviewShortNames.indexOf( this.siteInfo.publicSiteInfo.shortName ) > -1;
            if( shouldShowDwolla )
                this.isDwollaEnabledOnGroup = this.siteInfo.privateSiteInfo.isDwollaPaymentActive;
            this.isDwollaEnabledOnGroup = false;

            this.isStripeEnabledOnGroup = this.siteInfo.privateSiteInfo.isStripePaymentActive;
            if( this.isStripeEnabledOnGroup )
                this.stripeApi = Stripe( StripeApiKey, { stripeAccount: this.siteInfo.privateSiteInfo.stripeConnectAccountId } );

            this.dwollaFeePercent = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 0.5 : 1;
            this.dwollaStripeMaxFee = this.siteInfo.privateSiteInfo.isPremiumPlanActive ? 5 : 10;
            this.shouldShowOwnerFinanceTxn = this.siteInfo.privateSiteInfo.shouldShowOwnerFinanceTxn;
            this.currentDwollaAutoPayAmount = this.siteInfo.userInfo.dwollaAutoPayAmount;
            if( this.siteInfo.privateSiteInfo.customFinancialInstructions )
                this.customFinancialInstructions = this.$sce.trustAsHtml( this.siteInfo.privateSiteInfo.customFinancialInstructions );
            
            let numProviders = 0;
            if( this.isWePayPaymentActive )
                ++numProviders;
            if( this.isDwollaEnabledOnGroup )
                ++numProviders;
            if( this.isStripeEnabledOnGroup )
                ++numProviders;
            this.hasMultipleProviders = numProviders > 1;

            this.usersStripeBankAccountHint = this.siteInfo.userInfo.stripeBankAccountId ? this.siteInfo.userInfo.stripeBankAccountHint : null;
            this.userHasStripeAutoPay = !!this.siteInfo.userInfo.stripeAutoPaySubscriptionId;
            this.shouldAllowStripeAutoPay = this.siteInfo.publicSiteInfo.shortName === "qa";
            this.stripeAutoPayAmount = this.siteInfo.userInfo.stripeAutoPayAmount;
            this.hasStripePendingMicroDeposits = this.siteInfo.userInfo.hasStripePendingMicroDeposits;

            if( this.isDwollaEnabledOnGroup )
            {
                this.isDwollaUserAccountVerified = this.siteInfo.userInfo.isDwollaAccountVerified;
                if( this.isDwollaUserAccountVerified )
                {
                    this.dwollaUserStatus = "verified";
                    this.hasDwollaFundingSource = HtmlUtil2.isValidString( this.siteInfo.userInfo.dwollaFundingSourceName );

                    if( !this.hasDwollaFundingSource )
                    {
                        this.$http.get( "/api/Dwolla/HasComplexPassword" ).then(
                            ( response: ng.IHttpPromiseCallbackArg<boolean> ) => this.hasComplexPassword = response.data
                        );
                    }
                    else
                    {
                        this.dwollaFundingSourceName = this.siteInfo.userInfo.dwollaFundingSourceName;
                        this.dwollaFundingSourceIsVerified = this.siteInfo.userInfo.dwollaFundingSourceIsVerified;
                        this.isDwollaReadyForPayment = this.isDwollaUserAccountVerified && this.dwollaFundingSourceIsVerified && this.siteInfo.privateSiteInfo.isDwollaPaymentActive;

                        if( this.isDwollaReadyForPayment )
                        {
                            // Check the user's Dwolla balance, delayed since it's not important
                            this.$timeout( () =>
                            {
                                this.$http.get( "/api/Dwolla/DwollaBalance" ).then(
                                    ( response: ng.IHttpPromiseCallbackArg<any> ) => this.dwollaBalance = response.data.balanceAmount
                                );
                            }, 1000 );
                        }

                    }
                }
                else
                {
                    this.dwollaUserStatus = "checking";
                    this.userFullName = this.siteInfo.userInfo.fullName;
                    this.userEmail = this.siteInfo.userInfo.emailAddress;

                    //const getDwollaDocUploadToken = () =>
                    //{
                    //    this.$http.get( "/api/Dwolla/DocumentUploadToken" ).then(
                    //        ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                    //        {
                    //            const uploadToken = response.data;

                    //            window.setTimeout( () =>
                    //            {
                    //                dwolla.configure( {
                    //                    environment: AppConfigInfo.dwollaEnvironmentName,
                    //                    styles: "/main.css",
                    //                    token: () =>
                    //                    {
                    //                        const deferred = this.$q.defer();
                    //                        deferred.resolve( uploadToken );
                    //                        return deferred.promise;
                    //                    },
                    //                    //token: () => Promise.resolve( uploadToken ),
                    //                    success: ( res: any ) => alert( res ),
                    //                    error: ( err: any ) => alert( err )
                    //                } );
                    //            }, 200 );
                    //        },
                    //        ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                    //        {
                    //            this.dwollaUserStatus = "error";
                    //            console.log( "DocumentUploadToken failed: " + errorResponse.data.exceptionMessage );
                    //        }
                    //    );
                    //};

                    const checkDwollaStatus = () =>
                    {
                        this.$http.get( "/api/Dwolla/MyAccountStatus" ).then(
                            ( response: ng.IHttpPromiseCallbackArg<DwollaAccountStatusInfo> ) =>
                            {
                                this.dwollaUserStatus = response.data.status;
                                this.dwollaSignUpInfo.streetAddress = response.data.streetAddress;

                                //if( this.dwollaUserStatus === "document" )
                                //    getDwollaDocUploadToken();
                            },
                            ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                            {
                                this.dwollaUserStatus = "error";
                                console.log( "Failed to get Dwolla account status: " + errorResponse.data.exceptionMessage );
                            }
                        );
                    };

                    this.$timeout( () => checkDwollaStatus(), 500 );
                }
            }

            this.allyAppName = AppConfig.appName;
            this.isWePayAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.wePayAssessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.wePayAssessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "$1.50 service fee applies" : "No service fee";
            this.payerPaysAchFee = this.siteInfo.privateSiteInfo.payerPaysAchFee;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.isWePaySetup = this.siteInfo.privateSiteInfo.isPaymentEnabled;
            this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;

            if( !this.isWePayAutoPayActive && HtmlUtil.isNumericString( HtmlUtil.GetQueryStringParameter( "preapproval_id" ) ) )
            {
                // The user just set up auto-pay and it may take a second
                this.isWePayAutoPayActive = true;
            }
            this.isWePayAutoPayActive = false;

            this.nextAutoPayText = this.siteInfo.userInfo.nextAutoPayText;
            
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if( this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0 )
            {
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits
                    .filter( uu => !uu.isRenter )
                    .reduce( ( total, uu ) => total + ( uu.assessment || 0 ), 0 );
            }
            else
                this.assessmentAmount = 0;

            // Show the Dwolla auto-pay area if the group's Dwolla is setup and
            // assessment frequncy is defined, or if the user already has auto-pay
            this.shouldShowDwollaAutoPayArea = ( this.isDwollaReadyForPayment
                && this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.assessmentAmount > 0 )
                || ( typeof this.currentDwollaAutoPayAmount === "number" && !isNaN( this.currentDwollaAutoPayAmount ) && this.currentDwollaAutoPayAmount > 1 );

            // Temporarily disable while we figure out the contract
            this.shouldShowDwollaAutoPayArea = false;
            this.shouldShowStripeAutoPayArea = this.isStripeEnabledOnGroup && this.siteInfo.userInfo.stripeBankAccountId && this.siteInfo.publicSiteInfo.shortName === "qa";

            if( this.shouldShowDwollaAutoPayArea || this.shouldShowStripeAutoPayArea )
            {
                this.assessmentFrequencyInfo = PeriodicPaymentFrequencies.find( ppf => ppf.id === this.siteInfo.privateSiteInfo.assessmentFrequency );
            }

            this.paymentInfo =
            {
                paymentType: "other",
                amount: this.assessmentAmount,
                note: "",
                fundingType: null,
                paysFor: []
            };

            this.onPaymentAmountChange();

            const MaxNumRecentPayments: number = 24;
            this.historicPayments = this.siteInfo.userInfo.recentPayments;
            if( this.historicPayments && this.historicPayments.length > 0 )
            {
                if( this.historicPayments.length > MaxNumRecentPayments )
                    this.historicPayments = this.historicPayments.slice( 0, MaxNumRecentPayments );

                // Fill up the list so there's always MaxNumRecentPayments
                //while( this.historicPayments.length < MaxNumRecentPayments )
                //    this.historicPayments.push( {} );
            }

            // If the user lives in a unit and assessments are enabled
            if( this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.siteInfo.userInfo.usersUnits != null
                && this.siteInfo.userInfo.usersUnits.length > 0 )
            {
                this.paymentInfo.paymentType = "periodic";

                if( this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled )
                {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";

                    this.nextPaymentText = this.getNextPaymentText( this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue,
                        this.siteInfo.privateSiteInfo.assessmentFrequency );

                    this.updatePaymentText();
                }
            }

            //if( this.isStripeEnabledOnGroup )
            //    this.$timeout( () => this.hookUpStripeCheckout(), 300 );

            //setTimeout( () =>
            //{
            //    $( '#btn_view_pay_history' ).click( function()
            //    {
            //        $( '#pm_info' ).collapse( 'hide' );
            //        $( '#payment_history' ).collapse( 'show' );
            //    } );

            //    $( '#btn_view_pay_info' ).click( function()
            //    {
            //        $( '#payment_history' ).collapse( 'hide' );
            //        $( '#pm_info' ).collapse( 'show' );
            //    } );

            //    $( '.hide' ).click( function()
            //    {
            //        $( this ).parent().hide( '' );
            //    } );

            //}, 400 );
        }


        /**
         * Display the Paragon payment sign-up modal, with pre-population of data
         */
        showParagonSignUp()
        {
            this.showParagonCheckingSignUpModal = true;

            if( this.paragonSignUpInfo )
                return;

            // Pre-populate the user's info
            this.isLoading_Payment = true;

            this.$http.get( "/api/Paragon/SignUpPrefill" ).then(
                ( response: ng.IHttpPromiseCallbackArg<ParagonPayerSignUpInfo> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonSignUpInfo = response.data;

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonSignUpInfo = new ParagonPayerSignUpInfo();
                    console.log( "Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Submit the user's Paragon bank account information
         */
        showParagonCreditSignUp()
        {
            this.isLoading_Payment = true;
            this.paragonCardTokenizedUrl = null;
            this.paragonCardTokenizationMessage = "Connecting...";
            this.showParagonCreditSignUpModal = true;

            //this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl( "https://login.mycondoally.com/api/PublicParagon/FinishCardTokenization2" );
            //this.isLoading_Payment = false;


            this.$http.get( "/api/Paragon/CardTokenizationKey" ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonCardTokenizedUrl = this.$sce.trustAsResourceUrl( "https://stage.paragonsolutions.com/ws/hosted.aspx?Username=54cE7DU2p%2bBh7h9uwJWW8Q%3d%3d&Password=jYvmN41tt1lz%2bpiazUqQYK9Abl73Z%2bHoBG4vOZImo%2bYlKTbPeNPwOcMB0%2bmIS3%2bs&MerchantKey=1293&InvNum=" + response.data );
                    this.paragonCardTokenizationMessage = null;

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonCardTokenizationMessage = "There was an error connecting to the server. Please close this window and try again. If this has happened more than once please contact support.";
                    console.log( "Failed in CardTokenizationKey: " + errorResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Hide the paragon window, reloading the page if needed
         */
        hideParagonCreditSignUp()
        {
            this.showParagonCreditSignUpModal = false;

            // Reload the page to refresh the payment info
            if( this.paragonCardTokenizedUrl )
                window.location.reload();
        }


        /**
         * Submit the user's Paragon bank account information
         */
        submitParagonSignUp()
        {
            this.isLoading_Payment = true;
            this.paragonSignUpError = null;

            this.$http.post( "/api/Paragon/CheckPaymentSignUp", this.paragonSignUpInfo ).then(
                () =>
                {
                    // Reload the page to refresh the payment info. We don't really need to do this,
                    // but makes sure the UI is up to date a little better as well updates the
                    // siteInfo object.
                    window.location.reload();

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonSignUpError = errorResponse.data.exceptionMessage;
                }
            );
        }


        /**
         * Submit the user's Paragon bank account information
         */
        submitParagonPayment( paySource: string )
        {
            if( !confirm( "This will submit payment." ) )
                return;

            this.paragonPaymentMessage = null;

            const paymentInfo = new ParagonPaymentRequest();
            paymentInfo.notes = this.paymentInfo.note;
            paymentInfo.paymentAmount = this.paymentInfo.amount;
            paymentInfo.paysFor = this.paymentInfo.paysFor;
            paymentInfo.paySource = paySource;

            this.isLoading_Payment = true;

            this.$http.post( "/api/Paragon/MakePayment", paymentInfo ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.paragonPaymentMessage = "Payment Successfully Processed";

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
                }
            );
        }


        /**
         * Un-enroll a certain payment source from Paragon payments
         */
        unenrollParagonAccount( paySource: string )
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/Paragon/UnenrollPayment?paySource=" + paySource ).then(
                () =>
                {
                    // Reload the page to see the change
                    window.location.reload();

                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to un-enroll: " + errorResponse.data.exceptionMessage );
                    this.paragonPaymentMessage = errorResponse.data.exceptionMessage;
                }
            );
        }


        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        submitWePayPayment( fundingTypeName: string )
        {
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;

            // Remove leading dollar signs
            const testAmount = this.paymentInfo.amount as any;
            if( HtmlUtil.isValidString( testAmount ) && ( testAmount as string )[0] === '$' )
                this.paymentInfo.amount = parseFloat( testAmount.substr( 1 ) );

            analytics.track( "makePayment", {
                fundingType: fundingTypeName
            } );

            this.$http.post( "/api/WePayPayment/MakeNewPayment", this.paymentInfo ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<CheckoutRequest> ) =>
                {
                    const checkoutInfo = httpResponse.data;

                    if( checkoutInfo !== null && typeof ( checkoutInfo.checkoutUri ) === "string" && checkoutInfo.checkoutUri.length > 0 )
                    {
                        //if( checkoutInfo.pendingPaymentAmount )
                        //{
                        //    const pendingDateStr = moment( checkoutInfo.pendingPaymentDateUtc ).format("M/D/YYYY h:mma")
                        //    const pendingMessage = `You already have a pending payment of $${checkoutInfo.pendingPaymentAmount} made on ${pendingDateStr}. Would you still like to continue to a make a new payment?`;
                        //    if( !confirm( pendingMessage ) )
                        //    {
                        //        this.isLoading_Payment = false;
                        //        return;
                        //    }
                        //}

                        window.location.href = checkoutInfo.checkoutUri;
                    }
                    else
                    {
                        this.isLoading_Payment = false;
                        alert( "Unable to initiate WePay checkout" );
                    }

                },
                ( httpResponse: any ) =>
                {
                    this.isLoading_Payment = false;

                    if( httpResponse.data && httpResponse.data.exceptionMessage )
                        alert( httpResponse.data.exceptionMessage );
                }
            );
        }


        getMyRecentPayments()
        {
            this.$http.get( "/api/WePayPayment/MyRecentPayments" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<ElectronicPayment[]> ) =>
                {
                    this.myRecentPayments = httpResponse.data;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    console.log( "Failed to retrieve recent payments: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user clicks the helper link to prep an email to inquire the board as to
         * why their records don't line up.
         */
        onIncorrectPayDetails()
        {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            let amountString = this.assessmentAmount.toString();
            if( Math.round( this.assessmentAmount ) != this.assessmentAmount )
                amountString = this.assessmentAmount.toFixed( 2 );

            // Tell the groupSendEmail component to prep an email for the board
            let prepEventData = amountString;
            if( this.knowsNextPayment && HtmlUtil.isValidString( this.nextPaymentText ) )
                prepEventData += "|" + this.nextPaymentText;

            this.$rootScope.$broadcast( "prepAssessmentEmailToBoard", prepEventData );
        }


        /**
         * Refresh the note text for the payment field
         */
        updatePaymentText()
        {
            if( this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled )
            {
                // If we have a next payment string
                if( !HtmlUtil.isNullOrWhitespace( this.nextPaymentText ) )
                {
                    if( this.siteInfo.userInfo.usersUnits[0].includesLateFee )
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";

                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else
            {
                this.paymentInfo.note = "";
            }
        }


        /**
         * Occurs when the user selects a payment type radio button
         */
        onSelectPaymentType( paymentType: string )
        {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            
            this.updatePaymentText();
            this.onPaymentAmountChange();
        }


        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        getNextPaymentText( curPeriod: Ally.PayPeriod, assessmentFrequency: number )
        {
            if( !curPeriod )
                return "";

            let paymentText = "";

            const frequencyInfo = FrequencyIdToInfo( assessmentFrequency );

            const periodNames = GetLongPayPeriodNames( frequencyInfo.intervalName );
            if( periodNames )
                paymentText = periodNames[curPeriod.period - 1];

            paymentText += " " + curPeriod.year;

            this.paymentInfo.paysFor = [curPeriod];

            return paymentText;
        }


        /**
         * Occurs when the user presses the button to setup auto-pay for assessments
         */
        onSetupWePayAutoPay( fundingTypeName: string )
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    const redirectUrl = httpResponse.data;

                    if( typeof ( redirectUrl ) === "string" && redirectUrl.length > 0 )
                        window.location.href = redirectUrl;
                    else
                    {
                        this.isLoading_Payment = false;
                        alert( "Unable to initiate WePay auto-pay setup" );
                    }

                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;

                    if( httpResponse.data && httpResponse.data.exceptionMessage )
                        alert( httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user clicks the button to disable auto-pay
         */
        onDisableAutoPay()
        {
            if( !confirm( "Just to double check, this will disable your auto-payment. You need to make sure to manually make your regular payments to avoid any late fees your association may enforce." ) )
                return;

            this.isLoading_Payment = true;

            this.$http.get( "/api/WePayPayment/DisableAutoPay" ).then( () =>
            {
                this.isLoading_Payment = false;
                this.isWePayAutoPayActive = false;

            }, ( httpResponse ) =>
            {
                this.isLoading_Payment = false;

                if( httpResponse.data && httpResponse.data.exceptionMessage )
                    alert( httpResponse.data.exceptionMessage );
            } );
        }


        /**
         * Sign-up a user for Dwolla payments
         */
        dwollaSignUp()
        {
            if( !this.didAgreeToDwollaTerms )
            {
                alert( "Please agree to Dwolla's terms and privacy policy" );
                return;
            }

            this.isLoading_Payment = true;

            this.$http.post( "/api/Dwolla/CreatePayer", this.dwollaSignUpInfo ).then( () =>
            {
                window.location.reload();

            }, ( httpResponse ) =>
            {
                this.isLoading_Payment = false;

                if( httpResponse.data && httpResponse.data.exceptionMessage )
                    alert( httpResponse.data.exceptionMessage );
            } );
        }


        /**
         * Begin the Dwolla IAV (instant account verification) process
         */
        dwollaStartIAV()
        {
            this.shouldShowDwollaAddAccountModal = true;
            this.shouldShowDwollaModalClose = false;
            this.isDwollaIavDone = false;
            this.isLoadingDwolla = true;

            const startIav = ( iavToken: string ) =>
            {
                dwolla.configure( AppConfigInfo.dwollaEnvironmentName );

                dwolla.iav.start( iavToken,
                    {
                        container: 'dwolla-iav-container',
                        stylesheets: [
                            'https://fonts.googleapis.com/css?family=Lato&subset=latin,latin-ext'
                        ],
                        microDeposits: true,
                        fallbackToMicroDeposits: true
                    },
                    ( err: any, res: any ) =>
                    {
                        //console.log( 'Error: ' + JSON.stringify( err ) + ' -- Response: ' + JSON.stringify( res ) );

                        if( res && res._links && res._links["funding-source"] && res._links["funding-source"].href )
                        {
                            const fundingSourceUri = res._links["funding-source"].href;

                            // Tell the server
                            this.$http.put( "/api/Dwolla/SetUserFundingSourceUri", { fundingSourceUri } ).then(
                                () =>
                                {
                                    this.isDwollaIavDone = true;
                                },
                                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                                {
                                    this.isLoadingDwolla = false;
                                    this.shouldShowDwollaModalClose = true;
                                    alert( "Failed to complete sign-up: " + httpResponse.data.exceptionMessage );
                                }
                            );
                        }
                    }
                );
            };

            this.$http.get( "/api/Dwolla/UserIavToken" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<any> ) =>
                {
                    this.isLoadingDwolla = false;

                    window.setTimeout( () => startIav( httpResponse.data.iavToken ), 150 );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoadingDwolla = false;

                    alert( "Failed to start IAV: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        hideDwollaAddAccountModal()
        {
            this.shouldShowDwollaAddAccountModal = false;

            if( this.isDwollaIavDone )
            {
                this.isLoading_Payment = true;
                window.location.reload();
            }
        }


        /**
         * Submit the user's Paragon bank account information
         */
        submitDwollaPayment()
        {
            //if( !confirm( "This will submit payment." ) )
            //    return;

            this.dwollaPaymentMessage = null;

            this.isLoading_Payment = true;

            this.$http.post( "/api/Dwolla/MakePayment", this.paymentInfo ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.dwollaPaymentMessage = "Payment Successfully Processed";

                    this.refreshHistoricPayments();
                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    this.dwollaPaymentMessage = "Payment failed: " + errorResponse.data.exceptionMessage;
                }
            );
        }


        refreshHistoricPayments()
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/MyProfile/RecentPayments" ).then(
                ( response: ng.IHttpPromiseCallbackArg<RecentPayment[]> ) =>
                {
                    this.isLoading_Payment = false;
                    this.historicPayments = response.data;
                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    console.log( "Failed to refresh rescent payments: " + errorResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Unlink and remove a user's Dwolla funding source
         */
        unlinkDwollaFundingSource()
        {
            if( !confirm( "Are you sure you want to disconnect the bank account? You will no longer be able to make payments." ) )
                return;

            this.isLoading_Payment = true;

            this.$http.put( "/api/Dwolla/DisconnectUserFundingSource", null ).then(
                () =>
                {
                    window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to disconnect account" + httpResponse.data.exceptionMessage );
                }
            );
        }


        getDwollaFeeAmount( amount: number )
        {
            // dwollaFeePercent is in display percent, so 0.5 = 0.5% = 0.005 scalar
            // So we only need to divide by 100 to get our rounded fee
            let feeAmount = Math.ceil( amount * this.dwollaFeePercent ) / 100;

            // Cap the fee at $5 for premium, $10 for free plan groups
            if( feeAmount > this.dwollaStripeMaxFee )
                feeAmount = this.dwollaStripeMaxFee;

            return feeAmount;
        }


        getStripeFeeAmount( amount: number )
        {
            if( typeof amount === "string" )
                amount = parseFloat( amount );

            if( isNaN( amount ) )
                amount = 0;

            if( !amount )
                return 0;
                            
            const stripeFeeInfo = HtmlUtil2.getStripeFeeInfo( amount, this.siteInfo.privateSiteInfo.payerPaysAchFee, this.siteInfo.privateSiteInfo.isPremiumPlanActive );
            //let feeAmount: number;

            //if( this.siteInfo.privateSiteInfo.payerPaysAchFee )
            //{
            //    // dwollaFeePercent is in display percent, so 0.8 = 0.8% = 0.008 scalar
            //    // So we only need to divide by 100 to get our rounded fee
            //    const StripeAchFeePercent = 0.008;
            //    let totalWithFeeAmount = Math.round( ( amount * 100 ) / ( 1 - StripeAchFeePercent ) ) / 100;
            //    feeAmount = totalWithFeeAmount - amount;

            //    // Cap the fee at $5 for premium, $10 for free plan groups
            //    const MaxFeeAmount = 5;
            //    const useMaxFee = feeAmount > MaxFeeAmount;
            //    if( useMaxFee )
            //    {
            //        feeAmount = MaxFeeAmount;
            //        totalWithFeeAmount = amount + feeAmount;
            //    }

            //    if( !this.siteInfo.privateSiteInfo.isPremiumPlanActive )
            //    {
            //        if( useMaxFee )
            //            totalWithFeeAmount = amount + ( MaxFeeAmount * 2 );
            //        else
            //            totalWithFeeAmount = Math.round( ( totalWithFeeAmount * 100 ) / ( 1 - StripeAchFeePercent ) ) / 100;

            //        feeAmount = totalWithFeeAmount - amount;

            //        // This can happen at $618.12-$620.61
            //        //console.log( "feeAmount", feeAmount );
            //        if( feeAmount > MaxFeeAmount * 2 )
            //            feeAmount = MaxFeeAmount * 2;
            //    }
            //}
            //// Otherwise the group is paying the fee so the resident doesn not pay extra fee
            //else
            //    feeAmount = 0;

            return stripeFeeInfo.payerFee;
        }


        /**
         * Occurs when the amount to pay changes
         */
        onPaymentAmountChange()
        {
            const dwollaFeeAmount = this.getDwollaFeeAmount( this.paymentInfo.amount );
            this.dwollaFeeAmountString = "$" + dwollaFeeAmount.toFixed( 2 );

            if( this.paymentInfo.amount )
            {
                const stripeFeeAmount = this.getStripeFeeAmount( this.paymentInfo.amount );
                if( !stripeFeeAmount )
                    this.stripeAchFeeAmountString = "No service fee";
                else
                    this.stripeAchFeeAmountString = "Stripe fee: $" + stripeFeeAmount.toFixed( 2 );
            }
            else
                this.stripeAchFeeAmountString = "";
        }


        /**
         * Occurs when the user clicks the button to upload their Dwolla identification document
         */
        uploadDwollaDoc()
        {
            this.isLoading_Payment = true;
            this.dwollaDocUploadMessage = null;

            const formData = new FormData();
            formData.append( "DocumentFile", this.dwollaDocUploadFile );
            formData.append( "DocumentType", this.dwollaDocUploadType );

            const postHeaders: ng.IRequestShortcutConfig = {
                headers: { "Content-Type": undefined } // Need to remove this to avoid the JSON body assumption by the server
            };

            this.$http.post( "/api/Dwolla/UploadCustomerDocument", formData, postHeaders ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.dwollaDocUploadFile = null;
                    this.dwollaDocUploadMessage = "Your document has been successfully uploaded. You will be notified when it is reviewed.";
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to upload document: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Occurs when the user selects a file for upload to Dwolla
         */
        onDwollaDocSelected( event: any )
        {
            if( !event )
                this.dwollaDocUploadFile = null;
            else
                this.dwollaDocUploadFile = event.target.files[0];
        }


        /**
         * Occurs when the user clicks the button to withdraw their Dwolla balance
         */
        withdrawDwollaBalance()
        {
            this.isLoading_Payment = true;
            this.dwollaBalanceMessage = null;

            this.$http.get( "/api/Dwolla/WithdrawDwollaBalance" ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.dwollaBalanceMessage = "Balance withdraw successfully initiated. Expect the transfer to complete in 1-2 business days.";
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to initiate withdraw: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        submitDwollaMicroDepositAmounts()
        {
            this.isLoading_Payment = true;

            const postData = {
                amount1String: this.dwollaMicroDepositAmount1String,
                amount2String: this.dwollaMicroDepositAmount2String,
                isForGroup: false
            };

            this.$http.post( "/api/Dwolla/VerifyMicroDeposit", postData ).then(
                () =>
                {
                    window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to verify: " + httpResponse.data.exceptionMessage );
                }
            )
        }


        reloadPage()
        {
            this.isLoading_Payment = true;
            window.location.reload();
        }


        enableDwollaAutoPay()
        {
            this.isLoading_Payment = true;

            this.$http.put( "/api/Dwolla/EnableAutoPay/" + encodeURIComponent( this.assessmentAmount.toString() ), null ).then(
                () =>
                {
                    window.location.reload();                    
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to enable Dwolla auto-pay: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        disableDwollaAutoPay()
        {
            this.isLoading_Payment = true;

            this.$http.put( "/api/Dwolla/DisableAutoPay", null ).then(
                () =>
                {
                    window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to disable Dwolla auto-pay: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        //hookUpStripeCheckout()
        //{
        //    const style = {
        //        base: {
        //            color: "#32325d",
        //            fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        //            fontSmoothing: "antialiased",
        //            fontSize: "16px",
        //            "::placeholder": {
        //                color: "#aab7c4"
        //            }
        //        },
        //        invalid: {
        //            color: "#fa755a",
        //            iconColor: "#fa755a"
        //        }
        //    };

        //    const stripeCheckoutOptions = {
        //        mode: 'payment',
        //        amount: 15 * 100,
        //        currency: 'usd',
        //        // Fully customizable with appearance API.
        //        appearance: {}
        //    };

        //    this.stripeElements = this.stripeApi.elements( stripeCheckoutOptions );

        //    this.stripeCardElement = this.stripeElements.create( "payment" );
        //    this.stripeCardElement.mount( "#stripe-card-element" );

        //    const onCardChange = ( event: any ) =>
        //    {
        //        if( event.error )
        //            this.showStripeError( event.error.message );
        //        else
        //            this.showStripeError( null );
        //    }

        //    this.stripeCardElement.on( 'change', onCardChange );
        //}


        showStripeError( errorMessage: string )
        {
            const displayError = document.getElementById( 'card-errors' );

            if( HtmlUtil.isNullOrWhitespace( errorMessage ) )
                displayError.textContent = null;//'Unknown Error';
            else
                displayError.textContent = errorMessage;
        }


        async startStripeCardPayment()
        {
            this.stripeElements.update( { amount: Math.floor( this.paymentInfo.amount * 100 ) } );

            // Trigger form validation and wallet collection
            this.stripeElements.submit().then(
                () =>
                {
                    this.isLoading_Payment = true;

                    this.$http.post( "/api/StripePayments/StartPaymentIntent", this.paymentInfo ).then(
                        ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                        {
                            // Confirm the PaymentIntent using the details collected by the Payment Element
                            this.stripeApi.confirmPayment( {
                                elements: this.stripeElements,
                                clientSecret: response.data,
                                confirmParams: {
                                    return_url: this.siteInfo.publicSiteInfo.baseUrl + "/#!/Home",
                                },
                            } );
                        },
                        ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                        {
                            this.isLoading_Payment = false;
                            console.log( "Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage );
                            alert( "Failed to start payment: " + errorResponse.data.exceptionMessage );
                        }
                    );
                },
                ( error: any ) =>
                {
                    console.log( "Stripe error", error );
                }
            );

            //this.stripeElements.submit();
            //if( submitError )
            //{
            //    this.showStripeError( submitError.message );
            //    return;
            //}
        }


        /**
         * Complete the Stripe-Plaid ACH-linking flow
         */
        completePlaidAchConnection( accessToken: string, accountId: string )
        {
            this.isLoading_Payment = true;

            const postData = {
                accessToken,
                selectedAccountIds: [accountId]
            };

            this.$http.post( "/api/PlaidMember/ProcessUserStripeAccessToken", postData ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    console.log( "Account successfully linked, reloading..." );
                    window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to link account: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Start the Stripe-Plaid ACH-linking flow
         */
        startPlaidAchConnection()
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/PlaidMember/StripeLinkToken" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    if( !httpResponse.data )
                    {
                        this.isLoading_Payment = false;
                        alert( "Failed to start Plaid connection. Please contact support." );
                        return;
                    }

                    const plaidConfig: any = {
                        token: httpResponse.data,
                        onSuccess: ( public_token: string, metadata: any ) =>
                        {
                            //console.log( "PlaidMember StripeLinkToken onSuccess", metadata );

                            this.completePlaidAchConnection( public_token, metadata.account_id );
                        },
                        onLoad: () =>
                        {
                            // Need to wrap this in a $scope.using because th Plaid.create call is invoked by vanilla JS, not AngularJS
                            this.$scope.$apply( () =>
                            {
                                this.isLoading_Payment = false;
                            } );
                        },
                        onExit: ( err: any, metadata: any ) =>
                        {
                            //console.log( "update onExit.err", err, metadata );

                            // Need to wrap this in a $scope.using because th Plaid.create call is invoked by vanilla JS, not AngularJS
                            this.$scope.$apply( () =>
                            {
                                this.isLoading_Payment = false;
                            } );
                        },
                        onEvent: ( eventName: string, metadata: any ) =>
                        {
                            console.log( "update onEvent.eventName", eventName, metadata );
                        },
                        receivedRedirectUri: null,
                    };

                    const plaidHandler = Plaid.create( plaidConfig );
                    plaidHandler.open();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to start Plaid connection: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        makeStripeAchPayment()
        {
            this.isLoading_Payment = true;

            this.$http.post( "/api/StripePayments/StartPaymentIntent", this.paymentInfo ).then(
                ( response: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    const intentClientSecret = response.data;

                    this.stripeApi.confirmUsBankAccountPayment(
                        intentClientSecret,
                        {
                            payment_method: this.siteInfo.userInfo.stripeBankAccountId,
                            //on_behalf_of: this.siteInfo.privateSiteInfo.stripeConnectAccountId
                        }
                    ).then(
                        ( result: any ) =>
                        {
                            // Need to wrap this in a $scope.using because the confirmUsBankAccountPayment event is invoked by vanilla JS, not AngularJS
                            this.$scope.$apply( () =>
                            {
                                this.isLoading_Payment = false;
                                this.stripePaymentSucceeded = true;
                            } );

                            if( result.error )
                            {
                                // Inform the customer that there was an error.
                                console.log( result.error.message );
                            } else
                            {
                                //TODO Success

                                // Handle next step based on PaymentIntent's status.
                                console.log( "PaymentIntent ID: " + result.paymentIntent.id );
                                console.log( "PaymentIntent status: " + result.paymentIntent.status );
                            }
                        },
                        ( error: any ) =>
                        {
                            // Need to wrap this in a $scope.using because th confirmUsBankAccountPayment event is invoked by vanilla JS, not Angular
                            this.$scope.$apply( () =>
                            {
                                this.isLoading_Payment = false;
                            } );

                            console.log( "Stripe Failed", error );
                            alert( "Stripe Failed: " + error );
                        }
                    );
                },
                ( errorResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    console.log( "Failed to SignUpPrefill: " + errorResponse.data.exceptionMessage );
                    alert( "Failed to start payment: " + errorResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Unlink and remove a user's Stripe funding source
         */
        unlinkStripeFundingSource()
        {
            if( !confirm( "Are you sure you want to disconnect the bank account? You will no longer be able to make payments." ) )
                return;

            this.isLoading_Payment = true;

            this.$http.delete( "/api/StripePayments/RemoveBankAccount" ).then(
                () =>
                {
                    window.location.reload();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to disconnect account: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        enableStripeAutoPay()
        {
            this.isLoading_Payment = true;

            this.$http.put( "/api/StripePayments/SetupUserAutoPay", null ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.userHasStripeAutoPay = true;
                    alert( "Auto-pay successfully enabled" );
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to setup auto-pay: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        disableStripeAutoPay()
        {
            this.isLoading_Payment = true;

            this.$http.delete( "/api/StripePayments/CancelUserAutoPay" ).then(
                () =>
                {
                    this.isLoading_Payment = false;
                    this.userHasStripeAutoPay = false;
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<Ally.ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to cancel auto-pay: " + httpResponse.data.exceptionMessage );
                }
            );
        }


        /**
         * Prompt the user to enter their Plaid micro-deposit amounts to finish adding a bank
         * account for Stripe
         */
        completeStripeMicroDeposits()
        {
            this.isLoading_Payment = true;

            this.$http.get( "/api/PlaidMember/MicroDepositLinkToken" ).then(
                ( httpResponse: ng.IHttpPromiseCallbackArg<string> ) =>
                {
                    this.isLoading_Payment = false;

                    const newLinkToken = httpResponse.data;
                    if( !newLinkToken )
                    {
                        alert( "Something went wrong on the server. Please contact support." );
                        return;
                    }

                    const plaidConfig: any = {
                        token: newLinkToken,
                        onSuccess: ( public_token: string, metadata: any ) =>
                        {
                            console.log( "Plaid micro-deposits update onSuccess" );
                            this.completePlaidAchConnection( public_token, metadata.account_id );
                        },
                        onLoad: () => { /* */ },
                        onExit: ( err: any, metadata: any ) => { console.log( "onExit.err", err, metadata ); },
                        onEvent: ( eventName: string, metadata: any ) => { console.log( "onEvent.eventName", eventName, metadata ); },
                        receivedRedirectUri: null,
                    };

                    const plaidHandler = Plaid.create( plaidConfig );
                    plaidHandler.open();
                },
                ( httpResponse: ng.IHttpPromiseCallbackArg<ExceptionResult> ) =>
                {
                    this.isLoading_Payment = false;
                    alert( "Failed to start verification: " + httpResponse.data.exceptionMessage );
                }
            );
        }
    }

    class CheckoutRequest
    {
        wasSuccessful: boolean;
        checkoutUri: string;
    }

    class DwollaAccountStatusInfo
    {
        status: string;
        streetAddress: FullAddress;
    }

    class MakePaymentRequest
    {
        paymentType: string;
        amount: number;
        note: string;
        fundingType: string;
        paysFor: PayPeriod[];
    }
}


CA.angularApp.component( "assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
} );


class CreateDwollaUser
{
    dateOfBirth: string;
    ssnLast4: string;
    ssnFull: string;
    streetAddress: Ally.FullAddress;
}


class ParagonPayerSignUpInfo
{
    email: string;
    phoneNumber: string;
    firstName: string;
    lastName: string;
    billingAddress: Ally.FullAddress = new Ally.FullAddress();
    routingNumber: string;
    checkAccountNumber: string;
    checkType: "PERSONAL" | "BUSINESS" = "PERSONAL";
    accountType: "CHECKING" | "SAVINGS" = "CHECKING";
}


class ParagonPaymentRequest
{
    paymentAmount: number;
    notes: string;
    paysFor: Ally.PayPeriod[];
    paySource: string;
}
