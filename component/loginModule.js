var loginModule = {
    template: `
        <div>
            <div class="right-top-zone">
                <div v-if="!tokenIsFromUrl" style="display:contents;">
                    <button v-if="!keycloakAuthed" class="login-button" @click="loginProcess">登入</button>
                    <button v-else class="login-button" @click="logoutProcess">
                        <template v-if="userInfo.preferred_username !== undefined">
                            {{userInfo.preferred_username.toUpperCase()}}
                        </template>
                        (登出)
                    </button>
                </div>
            </div>
            <component :is="'style'">
                .right-top-zone {
                    position: absolute;
                    right: 1vw;
                    top: 1vw;
                    display: flex;
                }
                .login-button{
                    border-width: 0px;
                    font-size: 0.8rem;
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
            //和token相關的項目(data) START
            keycloak: null,
            keycloakTimer: null,
            keycloakAuthed: false,
            tokenIsFromUrl: false,
            loginFailMsg: "權限不足或登入失敗，請以admin或developer身份登入！",
            access_token: "",
            userInfo:{},
            resourceDict:{},    //key: resource name; value: resource本體
            fetchResourceIndex: 0,
            tempResourceDict:{},//resourceDict的暫存版(為了讓resourceDict更新時直接影響computed變數)
            //和token相關的項目(data) END
        };
    },
    props:{
        'auth-object-array': {
            type: Array,
            default: [],
        },   //[{name: xxx, resource: xxx, attribute:...}]
        //"resource", 
        //"attribute",
    },
    mounted: function(){
        this.checkTokenProcess();
        
    },
    unmounted: function(){
        this.keycloakDispose();
    },
    beforeDestroy: function() {
        
    },
    computed:{
        
    },
    watch:{
        authObjectArray(array){
            this.updateStatus();
        },
    },
    methods:{
        keycloakInit(){
            this.keycloak = new window.Keycloak({
                realm: 'tpm',
                url: 'http://10.57.20.154:8092/auth',
                //realm: 'Ods-auth',
                //url: 'http://127.0.0.1:28080/auth',
                clientId: 'mfg-view-client',
            });
            // 初始化 Keycloak
            //this.keycloak.init({
            //    onLoad: 'login-required', // 或者 'check-sso'，具體取決於你的需求
            //});
            this.keycloak.init({
                onLoad: 'check-sso', // 或者其他你需要的選項
            }).then((authenticated) => {
                    
                if (authenticated) {
                    //console.log('User is authenticated');
                    this.access_token = this.keycloak.token;
                    this.updateUserInfoByToken(this.access_token);
                    this.$emit("update-token", this.access_token);
                } 
                //else {
                //    console.log('User is not authenticated');
                //}
                this.keycloakAuthed = authenticated;

                //this.searchProcess();
                this.$emit('logined', true);
            }).catch((error)=>{
                //this.searchProcess();
                this.$emit('logined', false);
            });
            
            this.keycloakTimer = setInterval(async () => {
                try {
                    if(this.keycloakAuthed)
                    {
                        const refreshed = await this.keycloak.updateToken(90);
                        //console.log(refreshed ? 'Token was refreshed' : 'Token is still valid');
                    }
                } catch (error) {
                    console.error('Failed to refresh token:', error);
                }
            }, 60000);
        },
        keycloakDispose(){
            if(this.keycloakTimer !== null)
            {
                clearInterval(this.keycloakTimer);
                this.keycloakTimer = null;
            }
        },
        loginProcess: function(){
            console.log("start login");
            if(this.keycloak === null)
            {
                this.keycloakInit();
            }
            else
            {
                this.keycloak.login();
            }
            //this.$keyclock.logoutFn();
        },
        logoutProcess: function(){
            console.log("start logout");
            this.keycloakAuthed = false;
            if(this.keycloak !== null)
            {
                this.keycloak.logout();
            }
        },
        loginoutProcess: function(){
            if(!this.keycloakAuthed)    //需要登入
            {
                this.loginProcess();
            }
            else
            {
                this.logoutProcess();
            }
        },

        //cookie相關函式 START
        setCookie: function(key, value){
            document.cookie = key + "=" + value;
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
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        },
        //cookie相關函式 END

        //和token相關的項目(methods) START
        urlParams(key){
            const urlSearchParams = new URLSearchParams(window.location.search);
            return urlSearchParams.get(key) || '';
        },
        checkTokenProcess: function(){
            //處理access_token
            if(this.access_token === "" && this.urlParams("access_token") !== undefined)
            {
                this.access_token = this.urlParams("access_token");
            }
            if(this.access_token !== "")
            {
                this.updateUserInfoByToken(this.access_token);

                this.tokenIsFromUrl = true;
                this.keycloakAuthed = true;

                //this.searchProcess();
                this.$emit('logined', true);
            }
            else
            {
                this.tokenIsFromUrl = false;
                this.keycloakAuthed = false;
                this.keycloakInit();
            }
            this.$emit("update-token", this.access_token);
            this.$emit("update-portal", this.tokenIsFromUrl);
        },
        updateUserInfoByToken: function(token)
        {
            let strings = token.split(".");
            this.userInfo = JSON.parse(decodeURIComponent(escape(window.atob(strings[1].replace(/-/g, "+").replace(/_/g, "/")))));
            this.resourceDict = {};
            this.fetchResourceIndex = 0;
            this.tempResourceDict = {};
            this.fetchResourceProcess();

            this.$emit('update-user', this.userInfo);
        },
        fetchResourceProcess: function()
        {
            if(this.userInfo === undefined || 
                this.userInfo.realm_access === undefined ||
                this.userInfo.realm_access.roles === undefined ||
                this.userInfo.realm_access.roles.length <= this.fetchResourceIndex)
            {
                //fetchReosurceProcess完成
                //console.log("fetchResourceProcess done: " + JSON.stringify(this.resourceDict));
                this.resourceDict = this.tempResourceDict;
                this.updateStatus();
            }
            else
            {
                const token = this.access_token;
                const roleStr = this.userInfo.realm_access.roles.join(",");
                fetch(`http://10.57.20.154:8093/admin/component-control/roles/${roleStr}/tpm-resources`,
                {
                    method: 'GET', // 或其他 HTTP 方法，視你的需求而定
                    headers: {
                        'Authorization': `Bearer ${token}`, // 在這裡添加 Authorization 標頭
                        //'Content-Type': 'application/json', // 請根據 API 的要求設置 Content-Type
                    },
                })
                .then((response) => {
                    //console.log(response);
                    return response.json();
                })
                .then( (response) => {
                    //console.log(response);
                    if(response.data !== undefined && Array.isArray(response.data))
                    {
                        response.data.forEach((item)=>{
                            
                            if(this.tempResourceDict[item.name] !== undefined)
                            {
                                this.tempResourceDict[item.name] = this.combineResource(this.tempResourceDict[item.name], item);
                            }
                            else
                            {
                                this.tempResourceDict[item.name] = item;
                            }
                        });
                    }
                    this.resourceDict = this.tempResourceDict;
                    this.updateStatus();
                })
                .catch((error) => {
                    console.log("獲取資源失敗：" + error);
                });
                /*
                const token = this.access_token;
                fetch(`http://10.57.20.154:8093/admin/component-control/roles/${this.userInfo.realm_access.roles[this.fetchResourceIndex]}/tpm-resources`,
                {
                    method: 'GET', // 或其他 HTTP 方法，視你的需求而定
                    headers: {
                        'Authorization': `Bearer ${token}`, // 在這裡添加 Authorization 標頭
                        //'Content-Type': 'application/json', // 請根據 API 的要求設置 Content-Type
                    },
                })
                .then((response) => {
                    //console.log(response);
                    return response.json();
                })
                .then( (response) => {
                    //console.log(response);
                    if(response.data !== undefined && Array.isArray(response.data))
                    {
                        response.data.forEach((item)=>{
                            
                            if(this.tempResourceDict[item.name] !== undefined)
                            {
                                this.tempResourceDict[item.name] = this.combineResource(this.tempResourceDict[item.name], item);
                            }
                            else
                            {
                                this.tempResourceDict[item.name] = item;
                            }
                        });
                    }
                    this.fetchResourceIndex++;
                    this.fetchResourceProcess();
                })
                .catch((error) => {
                    //有些找不到資源的role，會回404 not found，無須理會，只要繼續做就好
                    this.fetchResourceIndex++;
                    this.fetchResourceProcess();
                });
                */
            }
            
        },
        clonedObject(obj){
            return JSON.parse(JSON.stringify(obj));
        },
        combineResource(re1, re2)
        {
            //針對attrs內容，取兩個資源的聯集(基本上判斷有true的，就為true，有多的值，就補上去，不然會沿用第一個)
            let re = this.clonedObject(re1);
            let attrDict = {};
            re1.attrs.forEach((item)=>{
                attrDict[item.key] = item;
            });

            re2.attrs.forEach((item)=>{
                if(attrDict[item.key] !== undefined)    //都有這個資源，那看有true的優先
                {
                    if(item.value === "true")
                    {
                        attrDict[item.key].value = "true";
                    }
                }
                else    //re2擁有re1沒有的資源
                {
                    attrDict[item.key] = item;
                }
            });
            
            re.attrs = Object.values(attrDict);

            return re;
        },
        getAttributeFromResource(resource, attrKey)
        {
            let res = undefined;
            if(this.resourceDict !== undefined &&
                this.resourceDict[resource] !== undefined &&
                this.resourceDict[resource].attrs !== undefined &&
                Array.isArray(this.resourceDict[resource].attrs))
            {
                res = this.resourceDict[resource].attrs.find(x => x.key === attrKey).value;
            }
            return res;
        },
        updateStatus(){
            //console.log("updateStatus");
            let res = {};

            if(this.userInfo !== undefined && 
                this.userInfo.realm_access !== undefined &&
                this.userInfo.realm_access.roles !== undefined
            )
            {
                //console.log("changed: " + JSON.stringify(this.authObjectArray));
                this.authObjectArray.forEach((item) => {
                    let value = this.getAttributeFromResource(item.resource, item.attribute);
                    if(value === "true")
                    {
                        res[item.name] = true;
                    }
                    else
                    {
                        res[item.name] = false;
                    }
                })
            }
            else
            {
                this.authObjectArray.forEach((item) => {
                    res[item.name] = false;
                })
            }
            
            this.$emit('update-auth', res);
        },
        //和token相關的項目(methods) END
    },
    emits: ['update-auth', 'update-portal', 'update-token', 'update-user', 'logined'],
};