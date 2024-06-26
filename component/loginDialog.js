var loginDialog = {
	template: `
        <div style="display:contents;">
            <button class="login-button" @click="loginButtonClick()">{{loginButtonMsg}}</button>
            <dialog ref="loginDialog" class="loginDialog">
                <form  @submit.prevent="loginProcess()">
                    <div style="text-align: center;">登入畫面</div>
                    <br>
                    帳號: <input type="text" v-model="user.name" name="user_name">
                    <br>
                    密碼: <input type="password" v-model="user.password" name="user_password" autocomplete="on">
                    <br><br>
                    <button type="button" style="float: left" @click="closeLoginDialog()">取消</button>
                    <button type="submit" style="float: right" >登入</button>
                </form>
            </dialog>
            <component :is="'style'">
                .login-button{
                    border-width: 0px;
                    font-size: 1.6vmin;
                    color: white;
                    background-color: transparent;
                    text-decoration: underline;
                    text-underline-offset: 5px;
                    cursor: pointer;
                }
                .loginDialog {
                    border: none;
                    box-shadow: 0px 0px 2px 2px #ccc;
                    border-radius: 10px;
                    background-color: #1a62ae;
                    color: white;
                }
                .loginDialog::backdrop {
                    background-color: rgba(0, 0, 0, 0.5);
                }
                .loginDialog input{
                    font-size: 2vmin;
                }
                .loginDialog button{
                    font-size: 2vmin;
                }
            </component>
        </div>
    `,
    data(){
        return {
            user:{
                name: "",
                password: "",
            },
            userInfo:{
                nickname: "",
            },
            loginButtonMsg: "登入",
            isLogin: false,

            timer: null,
        };
    },
    props:[
        
    ],
    mounted: function(){
        this.checkIsLogin();
        this.timer = setInterval(() => {
            this.checkIsLogin();
        }, 60*1000);    //60秒執行一次
    },
    beforeDestroy: function() {
        clearInterval(this.timer);
    },
    computed:{
        
    },
    watch:{
        
        
    },
    methods:{
        showLoginDialog(){
            this.logoutProcess("");
            this.$refs.loginDialog.showModal();
        },
        closeLoginDialog(){
            this.$refs.loginDialog.close();
        },
        loginButtonClick(){
            if(this.isLogin === false)
            {
                this.showLoginDialog();
            }
            else
            {
                this.logoutProcess("登入");
            }
        },
        checkIsLogin(){
            let checked = false;
            let cacheUserInfo = this.getCookie("MfgDashboardLoginInfo");
            if(cacheUserInfo !== undefined)
            {
                cacheUserInfo = JSON.parse(cacheUserInfo);
                if(cacheUserInfo.nickname !== "")
                {
                    checked = true;
                }
            }
            
            if(checked)
            {
                //console.log("checked: is logged in");
                if(this.isLogin === false || cacheUserInfo.nickname !== this.userInfo.nickname)
                {
                    this.userInfo = cacheUserInfo;
                    this.loggedinProcess();
                }
            }
            else
            {
                //console.log("checked: not loged in");
                if(this.isLogin === true)
                {
                    this.logoutProcess("已自動登出，請重新登入");
                }
            }
        },
        loginProcess(){
            
            fetch("http://10.35.22.72:88/api/platform-user/platform/login", {
                method: "POST",
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                },
                //別忘了把主體参數轉成字串，否則資料會變成[object Object]，它無法被成功儲存在後台
                body: JSON.stringify({
                    "copeCode": "TPE-NPI",
                    "username": this.user.name,
                    "password": this.user.password,
                    "loginType": 1
                })
            })
            .then(response => response.json())
            .then(res => {
                //console.log(res);
                if(res.code === undefined || res.code !== 200)
                {
                    alert("帳號或密碼不正確");
                }
                else
                {
                    this.userInfo = res.data;
                    
                    this.loggedinProcess();
                }
            })
            .catch((error) => {
                console.error(error);
                alert("API呼叫問題");
                
                this.closeLoginDialog();
            });
        },
        loggedinProcess(){
            if(this.userInfo.nickname === undefined || this.userInfo.nickname === "")
            {
                this.userInfo.nickname = this.userInfo.account;
            }
            this.loginButtonMsg = "歡迎 " + this.userInfo.nickname + "(登出)";
            this.isLogin = true;

            this.$emit('update', this.isLogin, this.userInfo);

            this.setCookieWithExpires("MfgDashboardLoginInfo", JSON.stringify(this.userInfo), 3600);    //1小時
            
            this.closeLoginDialog();
        },
        logoutProcess(buttonMsg){
            this.user.name = "";
            this.user.password = "";
            this.userInfo.nickname = "";
            if(buttonMsg !== "")
            {
                this.loginButtonMsg = buttonMsg;
            }
            this.isLogin = false;

            this.$emit('update', this.isLogin, this.userInfo);

            this.setCookieWithExpires("MfgDashboardLoginInfo", JSON.stringify(this.userInfo), 3600);    //1小時
        },

        //cookie相關函式 START
        setCookie: function(key, value){
            document.cookie = key + "=" + value + "; path=/";
        },
        setCookies: function(keys, values){
            keys.forEach((key, idx) => {
                this.setCookie(key, values[idx]);
            });
        },
        setCookieWithExpires: function(key, value, expiredSec){
            this.setCookie(key, value + "; max-age=" + expiredSec);
        },
        getCookie: function(name) {
            var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
            if (match) {
                //console.log(match[2]);
                return match[2];
            }
            else{
                //console.log('--something went wrong---');
                return undefined;
            }
        },
        //cookie相關函式 END
    },
    emits: ['update'],
};