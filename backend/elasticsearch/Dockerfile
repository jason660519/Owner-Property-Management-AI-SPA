FROM elasticsearch:8.12.0

ARG ES_PLUGIN_VERSION=8.12.0

# Install IK Analysis plugin
RUN bin/elasticsearch-plugin install --batch https://get.infini.cloud/elasticsearch/analysis-ik/${ES_PLUGIN_VERSION}

# Install STConvert (Simplified-Traditional Chinese) plugin
RUN bin/elasticsearch-plugin install --batch https://get.infini.cloud/elasticsearch/analysis-stconvert/${ES_PLUGIN_VERSION}
