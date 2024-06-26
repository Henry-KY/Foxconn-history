var versionModule = {
    template: `
    <div>
        <div id="version-template">
            <!--版本相關-->
            <div class="footer">
                <span style="cursor: pointer;" @click="showVersion">version: {{ version }}</span>
            </div>
        </div>
        <component :is="'style'">
            .footer {
                font-size: 1.0rem;
                position: fixed;
                bottom: 0px;
                left: 10px;
                opacity: 0.2;
            }
            
            .footer:hover {
                opacity: 1;
            }
        </component>
    </div>
    `,
    props: ['version', 'versionHistory'],
    methods:{
        showVersion() {
            alert(this.versionHistory.join("\r\n"));
        },
    },
};